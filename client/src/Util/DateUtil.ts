// https://stackoverflow.com/a/14509447/924597
import { forceError } from "Error/ErrorUtil";

/** expoected to be passed to the JSON.parse() method to "fix" Dates. */
export function dateTimeReviver(key : string, value: any) {
  let a;
  if (typeof value === 'string') {
    if( value.length === 24 && value[4] === '-' && value[value.length-1] === 'Z' ){
      // looks, sounds and smells like a duck
      try {
        const dateValue = parseServerDate(value);
        if( !dateValue ){
          console.warn("ignored unparsable server date", value);
          return value;
        }
        else {
          return dateValue;
        }
      }
      catch( err ){
        console.warn("ignored unparsable server date",
          forceError(err).message, value );
        return value;
      }
    }
  }
  return value;
}

const shorTimeformatOptions: Intl.DateTimeFormatOptions = {
  hour12: false, hour: "2-digit", minute: "2-digit"
};

export function parseJwtDate(date: string|number|undefined): Date | undefined{
  if( !date ){
    return undefined;
  }

  if( !Number.isInteger(date) ){
    console.debug("date was not an integer", date);
    return undefined;
  }
  
  return new Date(Number(date) * 1000);
}

/**
 * server datetime are expected to look like: 2022-04-13T01:07:47.154Z
 * I vaguely recall Safari having some non-standard date parsing issue?
 * Need to test.
 */
export function parseServerDate(date: string): Date{
  return new Date(date);
}


export function formatShortIsoDateTime(date?: Date){
  if( !date ){
    return ""
  }

  return formatIsoDate(date) + " " + formatShortTime(date);
}

export function formatShortTime(
  date?:Date,
  locale:string|undefined = undefined
):string{
  if( !date ){
    return ""
  }
  return date.toLocaleTimeString(locale, shorTimeformatOptions);
}

export function formatIsoDate(date?: Date){
  if( !date ){
    return "";
  }
  return extractDateFromIsoFormat(date.toISOString());
}

export function extractDateFromIsoFormat(date: string): string{
  if( !date ){
    return ""
  }
  if( date.length < 10 ){
    return ""
  }
  return date.substr(0, 10);
}
