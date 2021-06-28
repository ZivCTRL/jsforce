const Stream = require('stream-browserify');
const stream = require('readable-stream');
const Duplex = stream.Duplex;

export function createLazyStream() {
  const ins = new Stream.PassThrough();
  const outs = new Stream.PassThrough();
  const stream = concatStreamsAsDuplex(ins, outs);
  let piped = false;
  const setStream = (str: any) => {
    if (piped) {
      throw new Error('stream is already piped to actual stream');
    }
    piped = true;
    ins.pipe(str).pipe(outs);
  };
  return { stream, setStream };
}

// class MemoryWriteStream extends Writable {
//   _buf: Buffer;

//   constructor() {
//     super();
//     this._buf = Buffer.alloc(0);
//   }

//   _write(chunk: Buffer, encoding: string, callback: Function) {
//     this._buf = Buffer.concat([this._buf, chunk]);
//     callback();
//   }

//   _writev(
//     data: Array<{ chunk: Buffer; encoding: string }>,
//     callback: Function,
//   ) {
//     this._buf = Buffer.concat([this._buf, ...data.map(({ chunk }) => chunk)]);
//     callback();
//   }

//   toString() {
//     return this._buf.toString();
//   }
// }

class MemoryWriteStream {}

export async function readAll(rs: any) {
  return new Promise<string>((resolve, reject) => {
    const ws = new MemoryWriteStream();
    rs.on('error', reject)
      .pipe(ws)
      .on('finish', () => resolve(ws.toString()));
  });
}

// class DuplexifiedStream {}

class DuplexifiedStream extends Duplex {
  _writable: any;
  _readable: any;

  constructor(
    ws: any,
    rs: any,
    opts: { writableObjectMode?: boolean; readableObjectMode?: boolean } = {},
  ) {
    super({
      writableObjectMode: opts.writableObjectMode ?? ws.writableObjectMode,
      readableObjectMode: opts.readableObjectMode ?? rs.readableObjectMode,
    });
    this._writable = ws;
    this._readable = rs;
    ws.once('finish', () => {
      this.end();
    });
    this.once('finish', () => {
      ws.end();
    });
    rs.on('readable', () => {
      this._readStream();
    });
    rs.once('end', () => {
      this.push(null);
    });
    ws.on('error', (err : any) => this.emit('error', err));
    rs.on('error', (err : any) => this.emit('error', err));
  }

  _write(chunk: any, encoding: any, callback: any) {
    this._writable.write(chunk, encoding, callback);
  }

  _read(n: number) {
    this._readStream(n);
  }

  _readStream(n?: number) {
    let data;
    while ((data = this._readable.read(n)) !== null) {
      this.push(data);
    }
  }
}

export function concatStreamsAsDuplex(
  ws: any,
  rs: any,
  opts?: { writableObjectMode?: boolean; readableObjectMode?: boolean },
): any {
  return new DuplexifiedStream(ws, rs, opts);
}
