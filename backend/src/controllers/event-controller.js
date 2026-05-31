const ExcelJS = require("exceljs");
const path = require('path');
const moment = require('moment');
const fs = require('fs-extra');
const { eventpath } = require("../../environment-config");

exports.getEventsbyOrganization = async (req, res) => {
    const emailId = req.params.emailId;

    try {
        if (!emailId) {
            throw new Error("Email ID is required");
        }
        const organizationName = extractOrganizationName(emailId);
        const organizationFolder = path.resolve(eventpath, organizationName);

        if (!fs.existsSync(organizationFolder)) {
            return res.status(200).json({ message: 'Organization folder not found' });
        }

        const files = fs.readdirSync(organizationFolder).filter(file => file.endsWith('.xlsx'));
        const allEvents = {};

        for (const file of files) {
            const filePath = path.join(organizationFolder, file);
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.readFile(filePath);
            const worksheet = workbook.worksheets[0];
            const jsonData = worksheetToJson(worksheet);

            const filteredData = jsonData.filter(row => {
                let isMatching = false;
                for (const key in row) {
                    if (row[key] && typeof row[key] === 'number' && row[key] > 25569) {
                        if (isDateMatchingToday(row[key])) {
                            isMatching = true;
                            const formattedDate = moment(ExcelDateToJSDate(row[key])).format('DD/MM/YYYY');
                            row[key] = formattedDate;
                        }
                    }
                }
                return isMatching;
            });

            if (filteredData.length > 0) {
                const folderName = path.basename(file, path.extname(file));
                allEvents[folderName] = filteredData;
            }
        }

        return res.status(200).json(allEvents);

    } catch (err) {
        console.error('Error fetching events by organization:', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
  
function ExcelDateToJSDate(serial) {
    const utc_days = Math.floor(serial - 25569);
    const utc_value = utc_days * 86400;
    const date_info = new Date(utc_value * 1000);
    const fractional_day = serial - Math.floor(serial) + 0.0000001;
    const milliseconds = Math.round(fractional_day * 86400000);
    return new Date(date_info.getTime() + milliseconds);
}

function extractOrganizationName(emailId) {
    const parts = emailId.split('@');
    
    if (parts.length < 2) {
        return null;
    }
    
    const domain = parts[1];
    const organizationName = domain.split('.')[0];

    return organizationName;
}

function isDateMatchingToday(excelDate) {
    const formattedDate = moment(ExcelDateToJSDate(excelDate)).format('DD/MM');
    const today = moment().format('DD/MM');

    return formattedDate === today;
}

function worksheetToJson(worksheet) {
    if (!worksheet) {
        return [];
    }

    const headerRow = worksheet.getRow(1);
    const headers = [];
    headerRow.eachCell((cell, colNumber) => {
        headers[colNumber] = String(cell.value || '').trim();
    });

    const rows = [];
    worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) {
            return;
        }

        const rowData = {};
        row.eachCell((cell, colNumber) => {
            const header = headers[colNumber];
            if (!header) {
                return;
            }
            rowData[header] = normalizeExcelValue(cell.value);
        });

        if (Object.keys(rowData).length > 0) {
            rows.push(rowData);
        }
    });

    return rows;
}

function normalizeExcelValue(value) {
    if (value instanceof Date) {
        return JSDateToExcelDate(value);
    }
    if (value && typeof value === 'object') {
        return value.text || value.result || value.richText?.map(part => part.text).join('') || value;
    }
    return value;
}

function JSDateToExcelDate(date) {
    return (date.getTime() / 86400000) + 25569;
}

// try {
//     const filePath = path.resolve(__dirname, 'events.xlsx');

//     if (!fs.existsSync(filePath)) {
//       throw new Error("File not found");
//     }

//     const workbook = xlsx.readFile(filePath);
//     const sheetName = workbook.SheetNames[0];
//     const worksheet = workbook.Sheets[sheetName];
//     const jsonData = xlsx.utils.sheet_to_json(worksheet);

//     const events = jsonData.map((row) => ({
//       id: row.ID,
//       event: row.Event,
//       recipient: row.Recipient,
//       date: row.Date ? moment(ExcelDateToJSDate(row.Date)).format('DD/MM/YYYY') : null
//     }));

//     return Response.respondOk(res, events);
//   } catch (err) {
//     return Response.respondError(res, err);
//   }
