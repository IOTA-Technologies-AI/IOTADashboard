import dayjs from 'dayjs';

export function getThisMonth() {
  return {
    startDate: dayjs().startOf('month'),
    endDate: dayjs().endOf('month'),
  };
}

export function getLastMonth() {
  return {
    startDate: dayjs().subtract(1, 'month').startOf('month'),
    endDate: dayjs().subtract(1, 'month').endOf('month'),
  };
}

export function getLastQuarter() {
  return {
    startDate: dayjs().subtract(3, 'month').startOf('month'),
    endDate: dayjs().endOf('month'),
  };
}
