// utils/csvParser.ts

export interface ParsedCSVData {
    headers: string[];
    rows: string[][];
}

/**
 * Custom CSV parser that handles quoted fields with various quote characters
 * @param text - Raw CSV text content
 * @returns Parsed CSV data with headers and rows
 */
export const parseCustomCSV = (text: string): ParsedCSVData => {
    const lines = text.split(/\n/).filter(line => line.trim() !== '');
    const allRows: string[][] = [];

    for (const line of lines) {
        const row: string[] = [];
        let current = '';
        let inQuotes = false;
        let quoteChar = '';

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if ((char === '"' || char === "'") && !inQuotes && (i === 0 || line[i-1] === ',')) {
                inQuotes = true;
                quoteChar = char;
                continue;
            }
            else if (char === quoteChar && inQuotes && (i === line.length - 1 || line[i+1] === ',')) {
                inQuotes = false;
                quoteChar = '';
                continue;
            }
            else if (char === ',' && !inQuotes) {
                row.push(current.trim());
                current = '';
                continue;
            }

            current += char;
        }

        if (current.trim() !== '') {
            row.push(current.trim());
        }

        if (row.length > 0) {
            allRows.push(row);
        }
    }

    if (allRows.length === 0) {
        throw new Error('No data found in CSV');
    }

    const headers = allRows[0];
    const rows = allRows.slice(1);

    return { headers, rows };
};

/**
 * Load and parse CSV from a URL
 * @param url - URL to fetch CSV from
 * @returns Promise that resolves to parsed CSV data
 */
export const loadAndParseCSV = async (url: string): Promise<ParsedCSVData> => {
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Failed to load CSV: ${response.statusText}`);
    }

    const csvText = await response.text();
    return parseCustomCSV(csvText);
};