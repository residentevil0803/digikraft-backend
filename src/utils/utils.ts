import { HttpException, HttpStatus } from '@nestjs/common';

export function parseDate(date: string) {
  function throwException(date: string) {
    throw new HttpException(
      `Couldn't parse date string: ${date}`,
      HttpStatus.BAD_REQUEST,
    );
  }

  if (!date || date.length === 0) {
    throwException(date);
  }

  let parsedDate: Date;
  if (date[date.length - 1] !== 'Z') {
    parsedDate = new Date(date + 'Z');
  } else {
    parsedDate = new Date(date);
  }

  if (isNaN(parsedDate.getDate())) {
    throwException(date);
  }

  return parsedDate;
}

export function queryExprByDate(date: Date) {
  return {
    $expr: {
      $and: [
        { $eq: [{ $year: '$date' }, date.getFullYear()] },
        { $eq: [{ $month: '$date' }, date.getMonth() + 1] },
        { $eq: [{ $dayOfMonth: '$date' }, date.getDate()] },
        { $eq: [{ $hour: '$date' }, date.getHours()] },
      ],
    },
  } as object;
}
