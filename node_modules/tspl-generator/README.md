# TSPL Generator

![CI/CD](https://github.com/ceedadev/tspl-generator/actions/workflows/ci.yaml/badge.svg)

A TypeScript library for generating TSPL (Taiwan Semiconductor Printer Language) / TSPL2 commands for thermal label printers.

## Installation

### npm

```bash
npm install tspl-generator
```

### Browser Direct Download

For direct browser usage, you can download the latest browser bundle from:

- [GitHub Releases](https://github.com/ceedadev/tspl-generator/releases)

## Features

- Strongly typed API with TypeScript
- Fluent interface for easy command chaining
- Support for all common TSPL/TSPL2 commands
- Measurement system support (inches and millimeters)
- Browser support via UMD bundle

## Usage

### Basic Example (Node.js)

```typescript
import { TSPLPrinter, MeasurementSystem, Font } from "tspl-generator";

// Create a new printer instance
const label = new TSPLPrinter(MeasurementSystem.METRIC);

// Initialize with label size and settings
label.initialize({
  width: 100,
  height: 60,
  speed: 4,
  density: 8,
  gap: 3,
});

// Add text
label.addText({
  x: 10,
  y: 10,
  font: Font.FONT_1,
  text: "Hello World!",
});

// Add a barcode
label.addBarcode(10, 30, "128", 30, "12345678", 1);

// Print 2 copies
label.print(2);

// Get the generated TSPL code
const tsplCode = label.getBuffer();
console.log(tsplCode);
```

### Browser Usage

You can use the library directly in a browser by including the UMD bundle:

```html
<!-- Using CDN (recommended) -->
<script src="https://cdn.jsdelivr.net/npm/tspl-generator/dist/browser/tspl-generator.min.js"></script>

<!-- Or using a local file -->
<script src="path/to/tspl-generator.min.js"></script>

<script>
  // Create a new printer instance
  const printer = new TSPLGenerator.TSPLPrinter(
    TSPLGenerator.MeasurementSystem.METRIC
  );

  // Initialize with label size and settings
  printer.initialize({
    width: 100,
    height: 60,
    speed: 4,
    density: 8,
    gap: 3,
  });

  // Add text
  printer.addText({
    x: 10,
    y: 10,
    font: TSPLGenerator.Font.FONT_1,
    text: "Hello World!",
  });

  // Get the generated TSPL code
  const tsplCode = printer.getBuffer();
  console.log(tsplCode);
</script>
```

See the `examples/browser-example.html` file for a complete browser example.

### Available Commands

The library supports the following TSPL/TSPL2 commands:

#### Printer Setup

- `SIZE` - Set label size
- `GAP` - Set gap distance
- `SPEED` - Set print speed
- `DENSITY` - Set print density
- `CLS` - Clear image buffer

#### Text

- `TEXT` - Print text
- `BLOCK` - Print text block with word wrap

#### Barcodes

- `BARCODE` - Print various barcode types
- `QRCODE` - Print QR codes

#### Graphics

- `BOX` - Draw rectangle
- `LINE` - Draw line
- `CIRCLE` - Draw circle
- `ELLIPSE` - Draw ellipse

#### Images

- `BITMAP` - Print bitmap image
- `PUTBMP` - Print BMP file
- `PUTPCX` - Print PCX file
- `DOWNLOAD` - Download graphic to printer

#### Printing

- `PRINT` - Print labels

## API Reference

### TSPLPrinter Class

The main class for generating TSPL commands.

#### Constructor

```typescript
constructor(measurementSystem: MeasurementSystem = MeasurementSystem.ENGLISH)
```

#### Methods

- `initialize(config: LabelConfig): this` - Initialize printer with basic settings
- `setGap(gap: number, offset: number = 0): this` - Set gap between labels
- `addText(options: TextOptions): this` - Add text to the label
- `addTextBlock(x: number, y: number, width: number, height: number, font: Font | string, text: string, ...): this` - Add a text block with word wrap
- `addBarcode(x: number, y: number, barcodeType: BarcodeType | string, height: number, content: string, ...): this` - Add a barcode
- `addQRCode(x: number, y: number, content: string, ...): this` - Add a QR code
- `addBox(x: number, y: number, xEnd: number, yEnd: number, thickness: number = 1): this` - Add a box
- `addLine(x: number, y: number, xEnd: number, yEnd: number, thickness: number = 1): this` - Add a line
- `addCircle(x: number, y: number, diameter: number, thickness: number = 1): this` - Add a circle
- `addEllipse(x: number, y: number, width: number, height: number, thickness: number = 1): this` - Add an ellipse
- `addBitmap(x: number, y: number, width: number, height: number, bitmap: string, mode: 0 | 1 = 0): this` - Add a bitmap image
- `addBMP(x: number, y: number, filename: string): this` - Add a BMP image
- `print(copies: number = 1): this` - Print labels
- `clear(): this` - Clear the image buffer
- `getBuffer(): string` - Get the generated TSPL code
- `reset(): this` - Reset the buffer

## License

ISC

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
