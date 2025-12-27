import * as fs from 'fs/promises';
import Handlebars from 'handlebars';

export const ReadHTMLFile = <D>(
    path: string,
    replacements?: D,
): Promise<string> => {
    return fs.readFile(path, { encoding: 'utf-8' }).then((html: string) => {
        const template = Handlebars.compile(html);
        const htmlToSend = template(replacements);
        return htmlToSend;
    });
};