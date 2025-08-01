import React, { useState, useEffect, useMemo } from 'react';
import {
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TablePagination,
    IconButton,
    Typography,
    Box,
    Collapse,
    CircularProgress,
    Alert
} from '@mui/material';
import {
    KeyboardArrowUp,
    KeyboardArrowDown
} from '@mui/icons-material';
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

interface TableData {
    headers: string[];
    rows: string[][];
}

export const TableViewer: React.FC<TableViewerProps> = ({
                                                            activeDataset,
                                                            datasetInfo
                                                        }) => {
    const [tableData, setTableData] = useState<TableData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
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
                const response = await fetch(`./data/vulnerability_datasets/${activeDataset}.csv`);
                if (!response.ok) {
                    throw new Error(`Failed to load dataset: ${response.statusText}`);
                }

                const csvText = await response.text();

                // Manual parsing approach for this specific CSV format
                const parseCustomCSV = (text: string) => {
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

                    return allRows;
                };

                const customParsedData = parseCustomCSV(csvText);

                if (customParsedData.length > 1) {
                    const headers = customParsedData[0];
                    const rows = customParsedData.slice(1);
                    setTableData({ headers, rows });
                    setPage(0);
                    return;
                }

                setError('Failed to parse CSV data');

            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Failed to load data';
                setError(errorMessage);
            } finally {
                setLoading(false);
            }
        };

        loadCsvData();
    }, [activeDataset]);

    const handleChangePage = (_event: unknown, newPage: number) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const formatHeaderText = (header: string) => {
        return header.replace(/!!/g, ' → ');
    };

    const paginatedRows = useMemo(() => {
        if (!tableData) return [];
        const start = page * rowsPerPage;
        const end = start + rowsPerPage;
        return tableData.rows.slice(start, end);
    }, [tableData, page, rowsPerPage]);

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
                        <TableContainer className={styles['table-container']}>
                            <Table stickyHeader size="small" className={styles.table}>
                                <TableHead>
                                    <TableRow>
                                        {tableData.headers.map((header, index) => {
                                            const formattedHeader = formatHeaderText(header);
                                            return (
                                                <TableCell
                                                    key={index}
                                                    className={styles['header-cell']}
                                                >
                                                    <Typography
                                                        variant="caption"
                                                        className={styles['header-text']}
                                                    >
                                                        {formattedHeader}
                                                    </Typography>
                                                </TableCell>
                                            );
                                        })}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {paginatedRows.map((row, rowIndex) => (
                                        <TableRow
                                            key={rowIndex}
                                            hover
                                            className={styles['body-row']}
                                        >
                                            {row.map((cell, cellIndex) => (
                                                <TableCell
                                                    key={cellIndex}
                                                    className={styles['body-cell']}
                                                >
                                                    {cell || '—'}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </Box>

                {/* Pagination */}
                {tableData && !loading && !error && (
                    <TablePagination
                        component="div"
                        count={tableData.rows.length}
                        page={page}
                        onPageChange={handleChangePage}
                        rowsPerPage={rowsPerPage}
                        onRowsPerPageChange={handleChangeRowsPerPage}
                        rowsPerPageOptions={[5, 10, 25, 50]}
                        className={styles.pagination}
                    />
                )}
            </Collapse>
        </Paper>
    );
};