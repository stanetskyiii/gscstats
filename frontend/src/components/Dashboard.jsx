import React, { useState, useEffect } from 'react';
import { Box } from '@mui/material';
import { subDays, subMonths, format } from 'date-fns';

import DataModeToggle from './DataModeToggle';
import DomainDashboard from './DomainDashboard';
import CountryDashboard from './CountryDashboard';

/**
 * Главный компонент Dashboard, который переключается между
 * режимами просмотра данных по доменам и странам
 */
function Dashboard() {
  // Режим отображения данных (domains или countries)
  const [dataMode, setDataMode] = useState('domains');
  
  // Диапазон дат (общий для обоих режимов)
  const [startDate, setStartDate] = useState(format(subMonths(new Date(), 3), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(subDays(new Date(), 2), 'yyyy-MM-dd'));

  // Обработчик изменения режима данных
  const handleDataModeChange = (mode) => {
    setDataMode(mode);
  };
  
  // Обработчик изменения диапазона дат
  const handleDateRangeChange = (start, end) => {
    setStartDate(start);
    setEndDate(end);
  };
  
  return (
    <Box>
      {/* Переключатель режима данных */}
      <DataModeToggle 
        dataMode={dataMode} 
        onChange={handleDataModeChange} 
      />
      
      {/* Показываем соответствующий дашборд в зависимости от режима */}
      {dataMode === 'domains' ? (
        <DomainDashboard 
          startDate={startDate} 
          endDate={endDate} 
          onDateRangeChange={handleDateRangeChange} 
        />
      ) : (
        <CountryDashboard 
          startDate={startDate} 
          endDate={endDate} 
          onDateRangeChange={handleDateRangeChange} 
        />
      )}
    </Box>
  );
}

export default Dashboard;