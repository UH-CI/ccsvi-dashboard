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
    TableSortLabel,
    IconButton,
    Typography,
    Box,
    Collapse,
    CircularProgress,
    Alert,
    TextField,
    InputAdornment,
    Toolbar,
    Chip,
    Menu,
    MenuItem,
    Button
} from '@mui/material';
import {
    KeyboardArrowUp,
    KeyboardArrowDown,
    Search,
    FilterList,
    Clear,
    GetApp
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

interface ColumnFilter {
    column: string;
    value: string;
    type: 'text' | 'number' | 'range';
}

type Order = 'asc' | 'desc';

// Helper function to detect column data type
const detectColumnType = (columnData: string[]): 'number' | 'text' => {
    const numericValues = columnData.filter(val =>
        val && val !== '—' && !isNaN(Number(val.replace(/[,$%]/g, '')))
    );
    return numericValues.length > columnData.length * 0.7 ? 'number' : 'text';
};

// Comparison function for sorting
const descendingComparator = (a: string[], b: string[], orderBy: number, columnType: 'number' | 'text') => {
    const aVal = a[orderBy] || '';
    const bVal = b[orderBy] || '';

    if (columnType === 'number') {
        const aNum = parseFloat(aVal.replace(/[,$%]/g, '')) || 0;
        const bNum = parseFloat(bVal.replace(/[,$%]/g, '')) || 0;
        return bNum - aNum;
    }

    return bVal.localeCompare(aVal);
};

const getComparator = (order: Order, orderBy: number, columnType: 'number' | 'text') => {
    return order === 'desc'
        ? (a: string[], b: string[]) => descendingComparator(a, b, orderBy, columnType)
        : (a: string[], b: string[]) => -descendingComparator(a, b, orderBy, columnType);
};

export const TableViewer: React.FC<TableViewerProps> = ({
                                                            activeDataset,
                                                            datasetInfo
                                                        }) => {
    const [tableData, setTableData] = useState<TableData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(100);
    const [isMinimized, setIsMinimized] = useState(false);

    // Enhanced filtering and sorting state
    const [globalSearch, setGlobalSearch] = useState('');
    const [columnFilters, setColumnFilters] = useState<ColumnFilter[]>([]);
    const [order, setOrder] = useState<Order>('asc');
    const [orderBy, setOrderBy] = useState<number>(-1);
    const [filterMenuAnchor, setFilterMenuAnchor] = useState<null | HTMLElement>(null);
    const [selectedFilterColumn, setSelectedFilterColumn] = useState<number>(-1);

    // Reset filters when dataset changes
    useEffect(() => {
        setGlobalSearch('');
        setColumnFilters([]);
        setOrder('asc');
        setOrderBy(-1);
        setPage(0);
    }, [activeDataset]);

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

    // Column type detection
    const columnTypes = useMemo(() => {
        if (!tableData) return [];
        return tableData.headers.map((_, index) => {
            const columnData = tableData.rows.map(row => row[index] || '');
            return detectColumnType(columnData);
        });
    }, [tableData]);

    // Filtered and sorted data
    const processedData = useMemo(() => {
        if (!tableData) return [];

        let filteredRows = [...tableData.rows];

        // Apply global search
        if (globalSearch) {
            filteredRows = filteredRows.filter(row =>
                row.some(cell =>
                    cell && cell.toLowerCase().includes(globalSearch.toLowerCase())
                )
            );
        }

        // Apply column filters
        columnFilters.forEach(filter => {
            const columnIndex = tableData.headers.findIndex(header => header === filter.column);
            if (columnIndex === -1) return;

            filteredRows = filteredRows.filter(row => {
                const cellValue = row[columnIndex] || '';
                if (filter.type === 'number') {
                    const numValue = parseFloat(cellValue.replace(/[,$%]/g, ''));
                    const filterNum = parseFloat(filter.value);
                    return !isNaN(numValue) && !isNaN(filterNum) && numValue >= filterNum;
                }
                return cellValue.toLowerCase().includes(filter.value.toLowerCase());
            });
        });

        // Apply sorting
        if (orderBy >= 0) {
            filteredRows.sort(getComparator(order, orderBy, columnTypes[orderBy]));
        }

        return filteredRows;
    }, [tableData, globalSearch, columnFilters, order, orderBy, columnTypes]);

    // Pagination
    const paginatedRows = useMemo(() => {
        const start = page * rowsPerPage;
        const end = start + rowsPerPage;
        return processedData.slice(start, end);
    }, [processedData, page, rowsPerPage]);

    const handleChangePage = (_event: unknown, newPage: number) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const handleRequestSort = (columnIndex: number) => {
        const isAsc = orderBy === columnIndex && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(columnIndex);
    };

    const handleGlobalSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setGlobalSearch(event.target.value);
        setPage(0);
    };

    const handleAddColumnFilter = (columnIndex: number, value: string) => {
        if (!tableData || !value) return;

        const columnName = tableData.headers[columnIndex];
        const filterType = columnTypes[columnIndex] === 'number' ? 'number' : 'text';

        setColumnFilters(prev => [
            ...prev.filter(f => f.column !== columnName),
            { column: columnName, value, type: filterType }
        ]);
        setPage(0);
        setFilterMenuAnchor(null);
    };

    const handleRemoveFilter = (columnToRemove: string) => {
        setColumnFilters(prev => prev.filter(f => f.column !== columnToRemove));
        setPage(0);
    };

    const handleClearAllFilters = () => {
        setGlobalSearch('');
        setColumnFilters([]);
        setPage(0);
    };

    const handleExportFiltered = () => {
        if (!tableData) return;

        const csvContent = [
            tableData.headers.join(','),
            ...processedData.map(row => row.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${activeDataset}_filtered.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const formatHeaderText = (header: string) => {
        return header.replace(/!!/g, ' → ');
    };

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
                    {!isMinimized && processedData.length !== tableData?.rows.length && (
                        <Chip
                            label={`${processedData.length} of ${tableData?.rows.length || 0} rows`}
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
                    {/* Filter Toolbar */}
                    {tableData && !loading && !error && (
                        <Toolbar variant="dense" sx={{ minHeight: '48px', px: 2 }}>
                            <TextField
                                size="small"
                                placeholder="Search all columns..."
                                value={globalSearch}
                                onChange={handleGlobalSearchChange}
                                slotProps={{
                                    input: {
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <Search fontSize="small" />
                                            </InputAdornment>
                                        ),
                                    },
                                }}
                                sx={{ mr: 2, minWidth: 200 }}
                            />

                            <Button
                                size="small"
                                startIcon={<FilterList />}
                                onClick={(e) => setFilterMenuAnchor(e.currentTarget)}
                                sx={{ mr: 1 }}
                            >
                                Add Filter
                            </Button>

                            {(globalSearch || columnFilters.length > 0) && (
                                <Button
                                    size="small"
                                    startIcon={<Clear />}
                                    onClick={handleClearAllFilters}
                                    sx={{ mr: 1 }}
                                >
                                    Clear All
                                </Button>
                            )}

                            <Button
                                size="small"
                                startIcon={<GetApp />}
                                onClick={handleExportFiltered}
                                sx={{ ml: 'auto' }}
                            >
                                Export
                            </Button>
                        </Toolbar>
                    )}

                    {/* Active Filters */}
                    {columnFilters.length > 0 && (
                        <Box sx={{ px: 2, pb: 1 }}>
                            {columnFilters.map((filter, index) => (
                                <Chip
                                    key={index}
                                    label={`${filter.column}: ${filter.value}`}
                                    onDelete={() => handleRemoveFilter(filter.column)}
                                    size="small"
                                    sx={{ mr: 1, mb: 1 }}
                                />
                            ))}
                        </Box>
                    )}

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
                                                    sortDirection={orderBy === index ? order : false}
                                                >
                                                    <TableSortLabel
                                                        active={orderBy === index}
                                                        direction={orderBy === index ? order : 'asc'}
                                                        onClick={() => handleRequestSort(index)}
                                                    >
                                                        <Typography
                                                            variant="caption"
                                                            className={styles['header-text']}
                                                        >
                                                            {formattedHeader}
                                                        </Typography>
                                                    </TableSortLabel>
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

                {/* Filter Menu */}
                <Menu
                    anchorEl={filterMenuAnchor}
                    open={Boolean(filterMenuAnchor)}
                    onClose={() => setFilterMenuAnchor(null)}
                >
                    {tableData?.headers.map((header, index) => (
                        <MenuItem
                            key={index}
                            onClick={() => {
                                setSelectedFilterColumn(index);
                                setFilterMenuAnchor(null);
                            }}
                        >
                            {formatHeaderText(header)}
                        </MenuItem>
                    ))}
                </Menu>

                {/* Column Filter Dialog */}
                {selectedFilterColumn >= 0 && (
                    <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
                        <Typography variant="subtitle2" gutterBottom>
                            Filter: {formatHeaderText(tableData?.headers[selectedFilterColumn] || '')}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                            <TextField
                                size="small"
                                placeholder={columnTypes[selectedFilterColumn] === 'number' ? 'Minimum value...' : 'Filter text...'}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        const target = e.target as HTMLInputElement;
                                        handleAddColumnFilter(selectedFilterColumn, target.value);
                                        target.value = '';
                                        setSelectedFilterColumn(-1);
                                    }
                                }}
                                sx={{ flexGrow: 1 }}
                            />
                            <Button
                                size="small"
                                onClick={() => setSelectedFilterColumn(-1)}
                            >
                                Cancel
                            </Button>
                        </Box>
                    </Box>
                )}

                {/* Pagination */}
                {tableData && !loading && !error && (
                    <TablePagination
                        component="div"
                        count={processedData.length}
                        page={page}
                        onPageChange={handleChangePage}
                        rowsPerPage={rowsPerPage}
                        onRowsPerPageChange={handleChangeRowsPerPage}
                        rowsPerPageOptions={[10, 25, 50, 100]}
                        className={styles.pagination}
                    />
                )}
            </Collapse>
        </Paper>
    );
};