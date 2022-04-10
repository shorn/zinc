export function parseJwtDate(date: string | number | undefined): Date | undefined{
  if( !date ){
    return undefined;
  }

  if( !Number.isInteger(date) ){
    console.debug("date was not an integer", date);
    return undefined;
  }

  return new Date(Number(date) * 1000);
}
