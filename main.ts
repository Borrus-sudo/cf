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
        return errorify(`Could not retrieve the clipboard history!`);

    const base = new Deno.UnsafePointerView(arrPtr);

    const items: string[] = [];
    for (let i = 0; i < count; i++) {
        const ptr = base.getPointer(i * 8);
        if (ptr === null) continue;
        const str = new Deno.UnsafePointerView(ptr).getCString();
        items.push(str);
    }

    lib.symbols.free_clipboard_items(arrPtr, count);

    return items;
};

const parseArgs = async (): Promise<Result<string, Error>> => {
    const args = Deno.args;
    if (!args.length) return errorify('Please pass the filename!');
    const fileLoc = path.join(Deno.cwd(), args[0]);
    const exists = await fs.exists(fileLoc);
    if (!exists) return errorify(`File not found at location ${fileLoc}`);
    return fileLoc;
};

if (import.meta.main) {
    // main();
}
