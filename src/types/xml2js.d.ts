declare module 'xml2js' {
  export class Parser {
    parseString(xmlData: string, callback: (err: any, result: any) => void): void;
  }
}


