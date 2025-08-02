import React, { useState, useEffect, useMemo } from 'react';
import {
    Paper,
    Typography,
    Box,
    Collapse,
    CircularProgress,
    Alert,
    IconButton,
    Chip,
} from '@mui/material';
import {
    DataGrid,
    GridColDef
} from '@mui/x-data-grid';
import {
    KeyboardArrowUp,
    KeyboardArrowDown,
} from '@mui/icons-material';
import { loadAndParseCSV, ParsedCSVData } from '../../utils/csvParser';
import styles from './TableViewer.module.scss';

interface DatasetInfo {
    metricName?: string;
    metricLabel?: string;
    hawaiianHomelands?: boolean;
    columnThresholds?: Record<string, unknown>;
}

interface TableViewerProps {
    activeDataset: string;
    datasetInfo: DatasetInfo | null;
}

// Helper function to detect column data type
const detectColumnType = (columnData: string[]): 'number' | 'string' => {
    const numericValues = columnData.filter(val =>
        val && val !== '—' && !isNaN(Number(val.replace(/[,$%]/g, '')))
    );
    return numericValues.length > columnData.length * 0.7 ? 'number' : 'string';
};

// Clean header for display (separator replacement)
const cleanHeaderForDisplay = (header: string): string => {
    return header.replace(/!!/g, ' → ').trim();
};

// Calculate optimal column width based on header content
const calculateColumnWidth = (header: string): number => {
    const cleanedHeader = cleanHeaderForDisplay(header);

    const baseWidth = cleanedHeader.length * 6;

    const minWidth = 150;
    const maxWidth = 400;

    const calculatedWidth = Math.min(Math.max(baseWidth, minWidth), maxWidth);

    return calculatedWidth;
};

export const TableViewer: React.FC<TableViewerProps> = ({
                                                            activeDataset,
                                                            datasetInfo
                                                        }) => {
    const [tableData, setTableData] = useState<ParsedCSVData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isMinimized, setIsMinimized] = useState(false);

    useEffect(() => {
        const loadCsvData = async () => {
            if (!activeDataset) {
                setTableData(null);
                return;
            }

            setLoading(true);
            setError(null);

            try {
                const csvData = await loadAndParseCSV(`./data/vulnerability_datasets/${activeDataset}.csv`);
                setTableData(csvData);
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Failed to load data';
                setError(errorMessage);
            } finally {
                setLoading(false);
            }
        };

        loadCsvData();
    }, [activeDataset]);

    // Convert CSV data to DataGrid format
    const { columns, rows } = useMemo(() => {
        if (!tableData) return { columns: [], rows: [] };

        const columnTypes = tableData.headers.map((_: string, index: number) => {
            const columnData = tableData.rows.map((row: string[]) => row[index] || '');
            return detectColumnType(columnData);
        });

        const cols: GridColDef[] = tableData.headers.map((header: string, index: number) => {
            const displayHeader = cleanHeaderForDisplay(header);
            const columnWidth = calculateColumnWidth(header);

            return {
                field: `col_${index}`,
                headerName: displayHeader,
                type: columnTypes[index],
                width: columnWidth,
                minWidth: 150,
                maxWidth: 400,
                resizable: true,
                sortable: true,
                filterable: true,
                renderHeader: () => (
                    <div
                        title={displayHeader}
                        className={styles['custom-header']}
                    >
                        {displayHeader}
                    </div>
                ),
                valueFormatter: columnTypes[index] === 'number'
                    ? (value: unknown) => {
                        if (value === null || value === undefined || value === '—') return '—';
                        const num = parseFloat(String(value).replace(/[,$%]/g, ''));
                        return isNaN(num) ? String(value) : num.toLocaleString();
                    }
                    : undefined,
            };
        });

        const rowData = tableData.rows.map((row: string[], index: number) => {
            const rowObj: Record<string, string | number> = { id: index };
            row.forEach((cell: string, cellIndex: number) => {
                rowObj[`col_${cellIndex}`] = cell || '—';
            });
            return rowObj;
        });

        return { columns: cols, rows: rowData };
    }, [tableData]);

    const datasetLabel = useMemo(() => {
        if (!datasetInfo || !activeDataset) return activeDataset;
        return datasetInfo.metricLabel || activeDataset.replace(/_/g, ' ').toUpperCase();
    }, [activeDataset, datasetInfo]);

    if (!activeDataset) {
        return null;
    }

    return (
        <Paper
            elevation={3}
            className={`${styles['table-viewer']} ${isMinimized ? styles['table-viewer--minimized'] : styles['table-viewer--expanded']}`}
        >
            <Box
                className={`${styles.header} ${isMinimized ? styles['header--minimized'] : styles['header--expanded']}`}
                sx={{ backgroundColor: 'primary.main' }}
            >
                <Box className={styles['header-content']}>
                    <Typography variant="h6" component="div" className={styles.title}>
                        Dataset: {datasetLabel}
                    </Typography>
                    {!isMinimized && rows.length > 0 && (
                        <Chip
                            label={`${rows.length} rows`}
                            size="small"
                            className={styles.chip}
                        />
                    )}
                </Box>

                <Box className={styles['header-actions']}>
                    <IconButton
                        size="small"
                        onClick={() => setIsMinimized(!isMinimized)}
                        className={styles['toggle-button']}
                        sx={{ color: 'white' }}
                    >
                        {isMinimized ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
                    </IconButton>
                </Box>
            </Box>

            <Collapse in={!isMinimized}>
                <Box className={styles.content}>
                    {loading && (
                        <Box className={styles['loading-container']}>
                            <CircularProgress />
                        </Box>
                    )}

                    {error && (
                        <Alert severity="error" className={styles['error-alert']}>
                            {error}
                        </Alert>
                    )}

                    {tableData && !loading && !error && (
                        <Box className={styles['data-grid-container']}>
                            <DataGrid
                                rows={rows}
                                columns={columns}
                                showToolbar
                                slotProps={{
                                    toolbar: {
                                        csvOptions: {
                                            fileName: `${activeDataset}_export`,
                                            delimiter: ',',
                                            utf8WithBom: true
                                        },
                                        showQuickFilter: true,
                                        quickFilterProps: { debounceMs: 500 }
                                    }
                                }}
                                initialState={{
                                    pagination: {
                                        paginationModel: { pageSize: 25 }
                                    }
                                }}
                                pageSizeOptions={[10, 25, 50, 100]}
                                disableRowSelectionOnClick
                                density="compact"
                                className={styles['data-grid']}
                            />
                        </Box>
                    )}
                </Box>
            </Collapse>
        </Paper>
    );
};