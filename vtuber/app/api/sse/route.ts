import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  // Create a TransformStream for SSE
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  // Send initial connection message
  writer.write(encoder.encode('data: {"type":"connected","message":"SSE endpoint ready"}\n\n'));

  // Example: Send a test command every 5 seconds
  const interval = setInterval(async () => {
    try {
      // Random look position for demo
      const x = (Math.random() - 0.5) * 2;
      const y = (Math.random() - 0.5) * 2;
      
      const command = {
        type: 'lookAt',
        data: { x, y, instant: false }
      };
      
      await writer.write(
        encoder.encode(`data: ${JSON.stringify(command)}\n\n`)
      );
    } catch (error) {
      console.error('Error writing to stream:', error);
      clearInterval(interval);
    }
  }, 5000);

  // Clean up on disconnect
  request.signal.addEventListener('abort', () => {
    clearInterval(interval);
    writer.close();
  });

  // Return SSE response
  return new NextResponse(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}