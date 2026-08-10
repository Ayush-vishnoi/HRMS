const fs = require('fs');
const zlib = require('zlib');

function removeWhiteBackground(inputPath, outputPath) {
  const buffer = fs.readFileSync(inputPath);
  
  // Verify PNG signature
  if (buffer.readUInt32BE(0) !== 0x89504E47) {
    console.error('Not a valid PNG file');
    return;
  }

  let offset = 8;
  let width, height, bitDepth, colorType, compression, filter, interlace;
  let idatChunks = [];

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);

    if (type === 'IHDR') {
      width = buffer.readUInt32BE(offset + 8);
      height = buffer.readUInt32BE(offset + 12);
      bitDepth = buffer[offset + 16];
      colorType = buffer[offset + 17];
      console.log(`PNG Info: ${width}x${height}, depth=${bitDepth}, colorType=${colorType}`);
    } else if (type === 'IDAT') {
      idatChunks.push(buffer.slice(offset + 8, offset + 8 + length));
    } else if (type === 'IEND') {
      break;
    }

    offset += 12 + length;
  }

  if (colorType !== 2 && colorType !== 6) {
    console.log('Color type unsupported for basic script:', colorType);
    return;
  }

  const compressedData = Buffer.concat(idatChunks);
  const decompressed = zlib.inflateSync(compressedData);

  const bytesPerPixel = colorType === 6 ? 4 : 3;
  const scanlineLength = 1 + width * bytesPerPixel;
  const newScanlineLength = 1 + width * 4; // Target RGBA
  
  const newDecompressed = Buffer.alloc(height * newScanlineLength);

  for (let y = 0; y < height; y++) {
    const srcRowStart = y * scanlineLength;
    const destRowStart = y * newScanlineLength;
    
    // Filter byte
    newDecompressed[destRowStart] = decompressed[srcRowStart];

    for (let x = 0; x < width; x++) {
      let r, g, b, a = 255;
      
      if (colorType === 6) {
        r = decompressed[srcRowStart + 1 + x * 4];
        g = decompressed[srcRowStart + 1 + x * 4 + 1];
        b = decompressed[srcRowStart + 1 + x * 4 + 2];
        a = decompressed[srcRowStart + 1 + x * 4 + 3];
      } else {
        r = decompressed[srcRowStart + 1 + x * 3];
        g = decompressed[srcRowStart + 1 + x * 3 + 1];
        b = decompressed[srcRowStart + 1 + x * 3 + 2];
      }

      // Check if pixel is white or near-white background
      if (r > 235 && g > 235 && b > 235) {
        a = 0; // Make transparent
      }

      newDecompressed[destRowStart + 1 + x * 4] = r;
      newDecompressed[destRowStart + 1 + x * 4 + 1] = g;
      newDecompressed[destRowStart + 1 + x * 4 + 2] = b;
      newDecompressed[destRowStart + 1 + x * 4 + 3] = a;
    }
  }

  // Update IHDR to colorType 6 (RGBA)
  const newIhdr = Buffer.alloc(13);
  newIhdr.writeUInt32BE(width, 0);
  newIhdr.writeUInt32BE(height, 4);
  newIhdr[8] = 8; // bitDepth
  newIhdr[9] = 6; // colorType 6 = RGBA
  newIhdr[10] = 0;
  newIhdr[11] = 0;
  newIhdr[12] = 0;

  const newCompressed = zlib.deflateSync(newDecompressed);

  // Helper CRC32
  const crcTable = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    crcTable[n] = c;
  }

  function getCrc(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    }
    return (c ^ 0xffffffff) >>> 0;
  }

  function createChunk(type, data) {
    const typeBuf = Buffer.from(type, 'ascii');
    const lenBuf = Buffer.alloc(4);
    lenBuf.writeUInt32BE(data.length, 0);

    const typeAndData = Buffer.concat([typeBuf, data]);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(getCrc(typeAndData), 0);

    return Buffer.concat([lenBuf, typeAndData, crcBuf]);
  }

  const pngHeader = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  const ihdrChunk = createChunk('IHDR', newIhdr);
  const idatChunk = createChunk('IDAT', newCompressed);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  const finalPng = Buffer.concat([pngHeader, ihdrChunk, idatChunk, iendChunk]);
  fs.writeFileSync(outputPath, finalPng);
  console.log('Successfully written transparent PNG to', outputPath);
}

removeWhiteBackground('public/logo.png', 'public/logo_transparent.png');
