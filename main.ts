import { type Result, type Error, errorify } from './utils.ts';
import * as path from '@std/path';
import * as fs from '@std/fs';

const getClipboardHistory = (): Result<string[], Error> => {
    const lib = Deno.dlopen('./clipboard/clipboard.dll', {
        get_clipboard_items_count: { parameters: [], result: 'i32' },
        get_clipboard_items: { parameters: [], result: 'pointer' },
        free_clipboard_items: {
            parameters: ['pointer', 'i32'],
            result: 'void',
        },
    });

    const count = lib.symbols.get_clipboard_items_count();

    const arrPtr = lib.symbols.get_clipboard_items();
    if (arrPtr === null)
        return errorify(
            `Could not retrieve the clipboard history, make sure the Clipboard History is on, press "Win + V" for the same`
        );

    const base = new Deno.UnsafePointerView(arrPtr);

    const items: string[] = [];
    for (let i = 0; i < count; i++) {
        const ptr = base.getPointer(i * 8);
        if (ptr === null) continue;
        const str = new Deno.UnsafePointerView(ptr).getCString();
        items.push(str);
    }

    if (!items.length)
        return errorify(
            'Please copy the expected input and output into the clipboard. If you have done so, try making sure that getClipboardHistory is on by pressing "Win + V"'
        );

    lib.symbols.free_clipboard_items(arrPtr, count);

    return items.reverse();
};

const parseArgs = async (): Promise<Result<string, Error>> => {
    const args = Deno.args;
    if (!args.length) return errorify('Please pass the filename!');
    const fileLoc = path.join(Deno.cwd(), args[0]);
    const exists = await fs.exists(fileLoc);
    if (!exists) return errorify(`File not found at location ${fileLoc}`);
    return fileLoc;
};

const getInpOut = (
    clipHist: string[]
): Result<{ inp: string; out: string }, Error> => {
    let inp: string = '';
    let out: string = '';

    for (let idx = 0; idx < clipHist.length; idx++) {
        const text = clipHist[idx];
        if (/[0-9]/.test(text.trim().charAt(0))) {
            const expectedLines = parseInt(text.trim().charAt(0));
            const actualLines = text.split('\n').length;
            if ((actualLines - 1) % expectedLines == 0) {
                inp = text;
                let buffOut = '';
                if (idx - 1 >= 0) {
                    buffOut = clipHist[idx - 1];
                    if (buffOut.split('\n').length % expectedLines == 0) {
                        out = buffOut;
                    }
                }
                if (idx + 1 < clipHist.length) {
                    buffOut = clipHist[idx + 1];
                    if (buffOut.split('\n').length % expectedLines == 0) {
                        out = buffOut;
                    }
                }
                if (out) break;
            }
        }
    }

    if (!inp || !out)
        return errorify(
            'Please make sure that the input and output have been copied to the clipboard, make a fresh copy and try again!'
        );

    return { inp, out };
};

const exec = () => {};

const isError = (inp: unknown): inp is Error =>
    typeof inp == 'object' && inp != null && Object.hasOwn(inp, 'msg');

if (import.meta.main) {
    const items = getClipboardHistory();

    if (isError(items)) {
        console.log(items.msg);
        Deno.exit();
    }
}
