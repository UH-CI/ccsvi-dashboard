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

export const TableViewer: React.FC<TableViewerProps> = ({
                                                            activeDataset,
                                                            datasetInfo
                                                        }) => {
    const [tableData, setTableData] = useState<ParsedCSVData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isMinimized, setIsMinimized] = useState(false);

    // Load CSV data when activeDataset changes
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

        // Detect column types
        const columnTypes = tableData.headers.map((_: string, index: number) => {
            const columnData = tableData.rows.map((row: string[]) => row[index] || '');
            return detectColumnType(columnData);
        });

        // Create column definitions
        const cols: GridColDef[] = tableData.headers.map((header: string, index: number) => ({
            field: `col_${index}`,
            headerName: header.replace(/!!/g, ' → '),
            type: columnTypes[index],
            flex: 1, // Use flex instead of fixed width
            minWidth: 120, // Minimum width in pixels (MUI DataGrid doesn't support rem here)
            valueFormatter: columnTypes[index] === 'number'
                ? (value: unknown) => {
                    if (value === null || value === undefined || value === '—') return '—';
                    const num = parseFloat(String(value).replace(/[,$%]/g, ''));
                    return isNaN(num) ? String(value) : num.toLocaleString();
                }
                : undefined,
        }));

        // Create row data
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
            {/* Header */}
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

            {/* Content */}
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
                                        }
                                    }
                                }}
                                initialState={{
                                    pagination: {
                                        paginationModel: { pageSize: 100 }
                                    }
                                }}
                                pageSizeOptions={[10, 25, 50, 100]}
                                disableRowSelectionOnClick
                                density="compact"
                                sx={{
                                    height: '100%',
                                    width: '100%',
                                    '& .MuiDataGrid-main': {
                                        overflow: 'hidden'
                                    }
                                }}
                            />
                            <Box sx={{
                                p: 1,
                                borderTop: 1,
                                borderColor: 'divider',
                                display: 'flex',
                                justifyContent: 'flex-end',
                                minHeight: '3rem',
                                alignItems: 'center'
                            }}>
                            </Box>
                        </Box>
                    )}
                </Box>
            </Collapse>
        </Paper>
    );
};