const express = require('express');
const escpos = require('escpos');
escpos.USB = require('escpos-usb');
const moment = require('moment'); 
const usb = require('usb');

const cors = require('cors');


const app = express();
app.use(express.json());


app.use(cors({
  origin: ['http://localhost:3000', 'https://markit.co.in'],
  credentials: true // optional, only if you're using cookies or auth headers
}));


// Configure receipt layout
const RECEIPT_WIDTH = 42; // Characters per line 48 total
const COLUMN_WIDTHS = {
  sl:4,
  description:24,
  hsn:10,
  tax:10,

  qty: 4,
  mrp:10,
  value:10,
  disc:10,
  tvalue: 10,

};

function centerText(text, width) {
  const textStr = text.toString();
  const textLength = textStr.length;
  
  // If text is longer than width, return as-is
  if (textLength >= width) return textStr;
  
  // Calculate left and right padding
  const totalPadding = width - textLength;
  const leftPadding = Math.floor(totalPadding / 2);
  const rightPadding = totalPadding - leftPadding; // Accounts for odd widths
  
  return ' '.repeat(leftPadding) + textStr + ' '.repeat(rightPadding);
}

function textStart(text, width) {
  const textStr = text.toString();
  
  // If text is longer than width, return as-is
  if (textStr.length >= width) return textStr;
  
  // Left-align text and pad remaining space on the right
  return textStr + ' '.repeat(width - textStr.length);
}


// Helper function to format money values
const formatMoney = (amount) => parseFloat(amount).toFixed(2);






app.post('/api/print-bill', async (req, res) => {
  const bill = req.body;


  
  // Validate request
  if (!bill.invoiceNumber || !bill.entries || !bill.entries.length) {
    return res.status(400).json({ error: 'Invalid bill data' });
  }

  
  const formattedAddress = [
    bill.companyAddress.name,
    bill.companyAddress.street,
    bill.companyAddress.locality,
    bill.companyAddress.city,
    bill.companyAddress.state,
    bill.companyAddress.pincode ? `- ${bill.companyAddress.pincode}` : ''
  ]
  .filter(Boolean) // Remove any undefined or empty parts
  .join(', ');

  const calculatedDiscount = bill.discount < 0
  ? Math.abs(bill.discount) // if negative, make positive
  : (bill.subtotal * bill.discount) / 100; // if positive, treat as %



  let device;
  try {
    device = new escpos.USB();
  } catch (err) {
    console.error('USB Printer not found:', err.message);
    return res.status(500).json({ error: 'Printer not found. Please check connection.' });
  }

  const printer = new escpos.Printer(device);

  device.open((err) => {
    if (err) {
      console.error('Error opening printer:', err.message);
      return res.status(500).json({ error: 'Could not open printer connection' });
    }

    try {
      
      // Print header
      printer
        .align('ct')
        .style('b')
        .size(1, 1)
        .text(bill.companyName)
        .style('normal') 
        .size(0.5, 0.5)
        .text(formattedAddress)
        .text(`GSTIN:${bill.gstin} `)
        .feed(1)
        .drawLine()
        .align('lt')
        .text(`Invoice: #${bill.invoiceNumber}`)
        .raw(Buffer.from([0x1B, 0x4A, 10]))
        .text(`Date  : ${moment(bill.date).format('DD-MM-YYYY hh:mm A')}`)
        .raw(Buffer.from([0x1B, 0x4A, 10]))
        .text(`Payment Method: ${bill.paymentMethod}`)
        .drawLine();

      // Column headers (Row 1: SL, DESCRIPTION, TAX)
        printer
        .text(
          textStart("SL", COLUMN_WIDTHS.sl) +
          textStart("DESCRIPTION", COLUMN_WIDTHS.description) +
          textStart("HSN", COLUMN_WIDTHS.hsn) +
          textStart("TAX", COLUMN_WIDTHS.tax)
        )
        .raw(Buffer.from([0x1B, 0x4A, 10]))

        // Column headers (Row 2: QTY, MRP, VALUE, DISC, T.VALUE)
        printer
        .text(
          '    '+
          textStart("QTY", COLUMN_WIDTHS.qty) +
          textStart("MRP", COLUMN_WIDTHS.mrp) +
          textStart("VALUE", COLUMN_WIDTHS.value) +
          textStart("DISC", COLUMN_WIDTHS.disc) +
          textStart("T.VALUE", COLUMN_WIDTHS.tvalue)
        )
        .drawLine();

      // Print each item
      bill.entries.forEach((item,index) => {
        // Line 1: SL, DESCRIPTION, HSN, TAX%
        printer.text(
          textStart(index+1, COLUMN_WIDTHS.sl) +
          textStart(item.description, COLUMN_WIDTHS.description) +
          textStart(item.hsn, COLUMN_WIDTHS.hsn) +
          textStart(`${item.tax}%`, COLUMN_WIDTHS.tax)
        )
        .raw(Buffer.from([0x1B, 0x4A, 10]));

        // Line 2: QTY, MRP, VALUE, DISC, T.VALUE
        printer.text(
          '    '+
          textStart(item.qty, COLUMN_WIDTHS.qty) +
          textStart(formatMoney(item.mrp), COLUMN_WIDTHS.mrp) +
          textStart(formatMoney(item.value), COLUMN_WIDTHS.value) +
          textStart(`${item.discount}%`, COLUMN_WIDTHS.disc) +
          textStart(formatMoney(item.tvalue), COLUMN_WIDTHS.tvalue)
        );
      });

      // Print summary
      printer
      .drawLine()
      .style('b') // Start bold
      .text(
        '    ' + // 4 spaces indentation
        textStart(bill.tqty, COLUMN_WIDTHS.qty) +
        '          ' + // 13 spaces (adjust as needed)
        textStart(formatMoney(bill.tvalue), COLUMN_WIDTHS.value) +
        textStart(formatMoney(bill.tdiscount), COLUMN_WIDTHS.disc) +
        textStart(formatMoney(bill.subtotal), COLUMN_WIDTHS.tvalue)
      )
      .style('normal') // End bold
      .drawLine();

      printer
      .text(
        centerText('DISC/ROUND OFF(+/-)', 38) +
        textStart(formatMoney(calculatedDiscount))
      )
      .feed(1);

      printer
      .style('b')
      .align('ct') 
      .size(1,1)
      .text(" GRAND TOTAL:" + formatMoney(bill.grandTotal))
      .style('NORMAL')
      .size(0.5,0.5)
      .feed(1)

      printer
      .drawLine()
      .raw(Buffer.from([0x1D, 0x42, 1]))
      .size(1,1)
      .style('b')
      .text(" YOUR SAVING:" + formatMoney(calculatedDiscount + bill.tdiscount ))
      .raw(Buffer.from([0x1D, 0x42, 0]))
      .size(0.5,0.5)
      .style('NORMAL')
      .drawLine();


      if (bill.paymentMethod?.toLowerCase() === 'upi') {
       const tn = encodeURIComponent(`Payment for Invoice ID ${bill.invoiceNumber}`)
      const qrLink = `phonepe://pay?pa=${bill.upiId}&pn=${bill.accHolderName}&tn=${tn}&am=${bill.grandTotal}&cu=INR`;

        printer
          .align('ct')
          .feed(1)
          .text('Scan to pay via UPI')
          .qrimage(qrLink, function () {
            printer
            .feed(1)
              .align('ct')
              .text('Thank you for shopping!')
              .feed(1)
              .text('Returns accepted within 7 days')
              .text('with original receipt')
              .feed(2)
              .text('Customer care: +91 9945923901')
              .feed(8)
              .close();
          });
      } else {
        // Closing Message
        printer
        .feed(1)
          .align('ct')
          .text('Thank you for shopping!')
          .feed(1)
          .text('Returns accepted within 7 days')
          .text('with original receipt')
          .feed(2)
          .text('Customer care: 9876543210')
          .feed(8)
          .close();
      }

      // Common footer
      
    

      res.status(200).json({ message: 'Receipt printed successfully' });
    } catch (err) {
      console.error('Print error:', err);
      printer.cut().close();
      res.status(500).json({ error: 'Failed to print receipt', details: err.message });
    }
  });
});


app.post('/api/print-label', async (req, res) => {
  const items = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'No label data provided' });
  }

  let device;
  try {
    // Automatically create the USB device instance
    device = new escpos.USB();

    // Try to open the device (USB printer)
    device.open((err) => {
      if (err) {
        console.error('USB Printer not found or disconnected:', err.message);
        return res.status(500).json({ error: 'Printer not found or disconnected. Please check connection.' });
      }

      // Once the device is open, proceed with printing
      const printer = new escpos.Printer(device);

      try {
        for (const item of items) {
          const { shopname = '', barcode = '', code = '', productName = '', name = '', sprice, dprice, size = '',brand='' } = item;

          // Validate required fields
          if (!barcode || !productName || !name || !sprice || !shopname) {
            console.warn('Skipping item due to missing required fields:', item);
            continue;
          }

          const tsplCommands = `
            SIZE 50 mm,38 mm
            GAP 3 mm,0.7 mm
            DIRECTION 0
            CLS

            TEXT 10,18,"3",0,1,1,"${shopname}"
            BAR 0,48,400,2

            TEXT 10,58,"2",0,1,1,"${productName}"
            TEXT 10,83,"2",0,1,1,"${name}${size ? ' - ' + size : ''}"
            TEXT 10,110,"2",0,1,1,"MRP Rs.${parseFloat(sprice).toFixed(2)}"

            ${dprice ? `BAR 10,116,220,4` : ''}
            ${dprice ? `TEXT 10,136,"2",0,1,1,"Discount Rs.${parseFloat(dprice).toFixed(2)}"` : ''}

            TEXT 10,168,"1",0,1,1,"${code}-${brand}"
            BARCODE 10,185,"128",100,0,0,3,3,"${barcode}"
            TEXT 10,292,"1",0,1,1,"${barcode}"

            PRINT 1,1
          `;

          // Send the TSPL commands to the printer
          device.write(Buffer.from(tsplCommands));
        }

        printer
          .close();
      
     
        // After all labels are sent, close the device
        device.close(() => {
          console.log('Printer connection closed after printing.');
        });

        res.status(200).json({ message: 'Labels printed successfully' });
      } catch (error) {
        console.error('Print error:', error.message);
        device.close(() => {
          console.log('Printer connection closed after error.');
        });
        res.status(500).json({ error: 'Failed to print labels' });
      }
    });
  } catch (err) {
    console.error('Error initializing printer:', err.message);
    res.status(500).json({ error: 'Could not initialize printer. Please check connection.' });
  }
});


// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(3001, () => {
  console.log('🖨️  Receipt printer server running at http://localhost:3001');
});