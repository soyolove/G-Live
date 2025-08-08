export default function TestPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">样式测试</h1>
      
      {/* 原生 Tailwind 类 */}
      <div className="mb-8">
        <h2 className="text-xl mb-2">原生 Tailwind 类：</h2>
        <button className="bg-blue-500 text-white px-4 py-2 rounded">
          蓝色按钮
        </button>
        <button className="ml-2 bg-red-500 text-white px-4 py-2 rounded">
          红色按钮
        </button>
      </div>

      {/* CSS 变量颜色 */}
      <div className="mb-8">
        <h2 className="text-xl mb-2">CSS 变量颜色：</h2>
        <button className="bg-primary text-primary-foreground px-4 py-2 rounded">
          Primary 按钮
        </button>
        <button className="ml-2 bg-secondary text-secondary-foreground px-4 py-2 rounded">
          Secondary 按钮
        </button>
      </div>

      {/* 背景测试 */}
      <div className="mb-8">
        <h2 className="text-xl mb-2">背景色测试：</h2>
        <div className="bg-background p-4 border rounded">
          background 颜色
        </div>
        <div className="bg-card p-4 border rounded mt-2">
          card 颜色
        </div>
      </div>
    </div>
  );
}