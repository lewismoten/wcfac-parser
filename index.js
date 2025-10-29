import fs from "fs";

// const date = '2025-06-02';
const date = '2025-07-03';

const headers = [
  'Agency',
  'Agency Name',
  'Date',
  'Time',
  'Card',
  'Tag',
  'Veh ID',
  'Veh Description',
  'Odom',
  'MPG',
  'Merchant Address',
  'Trans #',
  'Code',
  'Product',
  'Qty',
  'OPIS',
  'Cost',
  'Orig',
  'Fed Subtract',
  'State Tax Subtracted',
  'Invoice Number',
  'Invoice Date',
  'County',
  'PPU',
  'VinNumber',
  'State'
];
const badHeaders = [
  'Agency',
  'Agency',
  'Name',
  'Date Time Card Tag Veh ID',
  'Veh',
  'Description',
  'Odom MPG Merchant Address Trans # Code Product Qty OPIS Cost Orig',
  'Fed',
  'Subtract',
  'State Tax',
  'Subtracted',
  'Invoice',
  'Number',
  'Invoice',
  'Date',
  'County PPU VinNumber State'
];

const txt = fs.readFileSync(`./txt/${date}.txt`, "utf-8");
console.log(`Bytes: ${txt.length}`);

const lines = txt.split('\n');
const lineCount = lines.length;
console.log(`Lines: ${lines.length}`);

let inHeader = true;
let inRecord = false;
let pageCount = 1;
let pageItem = 1;
let recordCount = 0;
let vinCount = 0;
let record = {};
let records = [];
let columnIndex = 0;

let csv = headers.join(',') + ',page,pageItem,record\n';
let vendor, vendorLabel, streetNo, streetName, town, state, zip;

lines.forEach((line, index) => {
  if (line.startsWith('Run date & time')) return;
  if (headers.includes(line) || badHeaders.includes(line)) {
    if (inRecord === true) {
      pageCount++;
      pageItem = 1;
      columnIndex = 0;
    } else {
      columnIndex++;
    }
    inRecord = false;
    inHeader = true;
  } else {
    if (inHeader === true) {
      record = {};
      recordCount++;
      columnIndex = 0;
    } else {
      columnIndex++;
    }
    inRecord = true;
    inHeader = false;
  }
  if (inRecord) {

    if (columnIndex === headers.length - 1) {
      // must be state, otherwise assume next record
      if (!/^[A-Z]{2}/.test(line)) {
        csv += `,${pageCount},${pageItem},${records.length + 1}\n`;
        columnIndex = 0;
        records.push(record);
        pageItem++;
        record = {};
      }
    }
    if (/^[A-Z]{2}/.test(line)) {
      csv += `,${pageCount},${pageItem},${records.length + 1}\n`;
      columnIndex = 0;
      records.push(record);
      pageItem++;
      record = {};
      // state is last record on July 3rd
      records.push(record);
      columnIndex = -1;
      csv += line + `,${pageCount},${pageItem},${records.length + 1}\n`;
    } else {
      if (/^[\dA-Z]{10,17}/.test(line)) {
        // VIN should be 17, but has many VINs as 16 chars
        vinCount++;
        record.VinNumber = line;
      } else if (headers[columnIndex] === 'Tag' && /^[\d]+$/.test(line)) {
        // No tag - we skipped to vehicle ID. Tags have at least 1 letter
        console.log(`${records.length} Not a tag: ${line}`);
        csv += ',';
        columnIndex++;
      }
      if (headers[columnIndex] === 'Veh ID' && (line !== 'Murano' && !/^[\d]+$/.test(line))) {
        const vehDescription = lines[index + 1];
        if (line === vehDescription) {
          // invalid vehicle id duplicates description
          console.log(`${records.length} Vehicle ID same as description: ${line}`);
          csv += ',';
          // columnIndex++;
          return;
        }
        // No vehicle id - we skipped to vehicle description. ids have digits only
        console.log(`${records.length} Not a vehicle id: ${line}`);
        csv += ',';
        columnIndex++;
      }
      if (headers[columnIndex] === 'Veh Description' && /^[\d,]+$/.test(line)) {
        console.log(`${records.length} Veh Description appears as odometer reading: ${line}`);
        csv += ',';
        columnIndex++;
      }
      if (headers[columnIndex] === 'Odom') {
        if (line === '0') {
          // Odometer missing - MPG calculates as zero
          console.log(`${records.length} Not an odometer reading: ${line}`);
          csv += ',';
          columnIndex++;
        } else if (!/^[\d,]+$/.test(line)) {
          // odd characters out of sync, skip this
          console.log(`${records.length} Not an odometer reading: ${line}`);
          return;
        }
      }
      if (headers[columnIndex] === 'Merchant Address') {
        if (/202 S Commerce Ave/i.test(line)) {
          vendor = 'Exxon S Commerce';
          vendorLabel = 'Exxon S Com';
          streetNo = '202';
          streetName = 'S Commerce Ave';
          town = 'Front Royal';
          state = 'VA';
          zip = '22630';
        } else if (/4697 JHN MARSHALL/i.test(line)) {
          vendor = '7-11';
          vendorLabel = '7-11 J Marshall';
          streetNo = 4697;
          streetName = 'John Marshall Highway';
          town = 'Linden';
          state = 'VA';
          zip = 22642;
        } else if (/10 SOUTH STREET/i.test(line)) {
          //10 SOUTH STREET FRONT ROYAL, VA 226300000
          vendor = 'bp';
          vendorLabel = 'bp S St';
          streetNo = 10;
          streetName = 'South Street';
          town = 'Front Royal';
          state = 'VA';
          zip = 22630;
        } else if (/1041 US RT 211 WEST/i.test(line)) {
          //1041 US RT 211 WEST LURAY, VA 228350000
          vendor = 'Exxon';
          vendorLabel = 'Exxon Rt 211';
          streetNo = 1041;
          streetName = 'Route 211 West';
          town = 'Luray';
          state = 'VA';
          zip = 22835;
        } else if (/11021 MARSH RD/i.test(line)) {
          //11021 MARSH RD BEALETON, VA 227120000
          vendor = '7-11';
          vendorLabel = '7-11 Marsh Rd';
          streetNo = 11021;
          streetName = 'Marsh Rd';
          town = 'Bealeton';
          state = 'VA';
          zip = 22712;
        } else if (/1621 N SHENANDOAH AVE/i.test(line)) {
          //1621 N SHENANDOAH AVE FRONT ROYAL, VA 226303641
          vendor = 'Sheetz';
          vendorLabel = 'Sheetz N Shen';
          streetNo = 1621;
          streetName = 'N Shenandoah Ave';
          town = 'Front Royal';
          state = 'VA';
          zip = 22630;
        } else if (/711 S ROYAL AVE/i.test(line)) {
          //711 S ROYAL AVE FRONT ROYAL, VA 226300000
          vendor = '7-11';
          vendorLabel = '7-11 S Royal';
          streetNo = 711;
          streetName = 'S Royal Ave';
          town = 'Front Royal';
          state = 'VA';
          zip = 22630;
        } else if (/1710 N SHENANDOAH/i.test(line)) {
          // 1710 N SHENANDOAH AVE FRONT ROYAL, VA 226300000
          vendor = 'Speedway';
          vendorLabel = 'Speedway N Shen';
          streetNo = 1710;
          streetName = 'N Shenandoah Ave';
          town = 'Front Royal';
          state = 'VA';
          zip = 22630;
        } else if (/195 COMMERCE/i.test(line)) {
          // 195 COMMERCE RD FRONT ROYAL, VA 226300000
          vendor = 'Quarles Fleet Feuling';
          vendorLabel = 'Quarles Commerce';
          streetNo = 195;
          streetName = 'Commerce Rd';
          town = 'Front Royal';
          state = 'VA';
          zip = 22630;
        }


      }
      if (headers[columnIndex] === 'OPIS') {
        // opis sometimes blank, so next value is high
        const opis = parseFloat(line.replace(/[$,]/g, ''));
        const cost = parseFloat(lines[index + 1].replace(/[$,]/g, ''));
        const threshold = .25
        if (cost > 5 && opis > cost * .25) {
          console.log(`${records.length} opis ${opis} is more than ${threshold * 100}% of cost ${cost} [${Math.round(1000 * (opis / cost)) / 10}]`)
          csv += ',';
          columnIndex++;
        }

      }
      if (line.includes(',') || line.includes("\"")) {
        line = `"${line.replace(/"/, /""/g)}"`;
      }
      if (line === 'TOTAL') {
        csv += ',,TOTAL,,,,,,,,,,,,,,';
      } else {
        record[headers[columnIndex]] = line;
        csv += line + ',';
      }
    }
  }
});

console.log(`Pages: ${pageCount}, Records: ${records.length}, Vin: ${vinCount}`);
// console.log(records);
fs.writeFileSync(`./txt/${date}.csv`, csv, 'utf-8');
console.log('done');