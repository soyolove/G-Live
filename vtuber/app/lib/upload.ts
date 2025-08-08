import { getFileLoader, getCubism2ModelSettings, getCubism4ModelSettings } from './live2d-loader';

const MAX_SETTINGS_FILES = 5;

export function isSettingsFile(filename: string): boolean {
    return filename.endsWith('.model.json') || filename.endsWith('.model3.json');
}

export function isMocFile(filename: string): boolean {
    return filename.endsWith('.moc') || filename.endsWith('.moc3');
}

export function isMocFileV2(filename: string): boolean {
    return filename.endsWith('.moc');
}

export function basename(filePath: string): string {
    return filePath.split('/').pop() || '';
}

// Initialize FileLoader override
async function initializeFileLoader() {
    const FileLoader = await getFileLoader();
    
    // Only override once
    if (!(FileLoader as any).__overridden) {
        const defaultCreateSettings = FileLoader.createSettings;
        
        FileLoader.createSettings = async (files: File[]) => {
            if (!files.find(file => isSettingsFile(file.name))) {
                return createFakeSettings(files);
            }
            return defaultCreateSettings(files);
        };
        
        (FileLoader as any).__overridden = true;
    }
}

export async function uploadFiles(files: File[]): Promise<any[]> {
    await initializeFileLoader();
    
    if (files.length === 1 && files[0].name.endsWith('.zip')) {
        // Let pixi-live2d-display handle zip files
        return [];
    }

    if (files.some(file => isSettingsFile(file.name))) {
        return createSettings(files);
    } else {
        return [await createFakeSettings(files)];
    }
}

async function createSettings(files: File[]): Promise<any[]> {
    const FileLoader = await getFileLoader();
    const settingsFiles: File[] = [];
    const nonSettingsFiles: File[] = [];

    for (const file of files) {
        if (isSettingsFile(file.name)) {
            settingsFiles.push(file);
        } else {
            nonSettingsFiles.push(file);
        }
    }

    if (settingsFiles.length > MAX_SETTINGS_FILES) {
        console.warn(`Too many settings files (${settingsFiles.length}/${MAX_SETTINGS_FILES})`);
        settingsFiles.length = MAX_SETTINGS_FILES;
    }

    let error: unknown;
    const settingsArray: any[] = [];

    await Promise.all(settingsFiles.map(
        async settingsFile => {
            try {
                const partialFiles = [settingsFile, ...nonSettingsFiles];
                const settings = await FileLoader.createSettings(partialFiles);
                settings.validateFiles(partialFiles.map(file => file.webkitRelativePath || file.name));
                settingsArray.push(settings);
            } catch (e) {
                error = error || e;
                console.warn(e);
            }
        },
    ));

    if (!settingsArray.length) {
        throw error;
    }

    return settingsArray;
}

async function createFakeSettings(files: File[]): Promise<any> {
    const Cubism2ModelSettings = await getCubism2ModelSettings();
    const Cubism4ModelSettings = await getCubism4ModelSettings();
    
    const mocFiles = files.filter(file => isMocFile(file.name));

    if (mocFiles.length !== 1) {
        const fileList = mocFiles.length ? `(${mocFiles.map(f => `"${f.name}"`).join(',')})` : '';
        throw new Error(`Expected exactly one moc file, got ${mocFiles.length} ${fileList}`);
    }

    const mocFile = mocFiles[0].name;
    const modelName = basename(mocFile).replace(/\.moc3?/, '');
    const filePaths = files.map(file => file.webkitRelativePath || file.name);
    const textures = filePaths.filter(f => f.endsWith('.png'));

    if (!textures.length) {
        throw new Error('Textures not found');
    }

    const motions = filePaths.filter(f => f.endsWith('.mtn') || f.endsWith('.motion3.json'));
    const physics = filePaths.find(f => f.includes('physics'));
    const pose = filePaths.find(f => f.includes('pose'));

    let settings: any;

    if (isMocFileV2(mocFile)) {
        settings = new Cubism2ModelSettings({
            url: modelName + '.model.json',
            textures, pose, physics,
            model: mocFile,
            motions: motions.length
                ? {
                    '': motions.map(motion => ({ file: motion })),
                }
                : undefined,
        });
    } else {
        settings = new Cubism4ModelSettings({
            url: modelName + '.model3.json',
            Version: 3,
            FileReferences: {
                Moc: mocFile,
                Textures: textures,
                Physics: physics,
                Pose: pose,
                Motions: motions.length
                    ? {
                        '': motions.map(motion => ({ File: motion })),
                    }
                    : undefined,
            },
        });
    }

    settings.name = modelName;
    (settings as any)._objectURL = 'DontTouchMe://' + settings.url;

    return settings;
}