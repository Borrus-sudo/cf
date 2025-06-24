const main = () => {
    const lib = Deno.dlopen('./clipboard/clipboard.dll', {
        get_clipboard_items_count: { parameters: [], result: 'i32' },
        get_clipboard_items: { parameters: [], result: 'pointer' },
        free_clipboard_items: {
            parameters: ['pointer', 'i32'],
            result: 'void',
        },
    });

    const count = lib.symbols.get_clipboard_items_count();
    console.log(`📋 Clipboard history (${count} items):`);

    const arrPtr = lib.symbols.get_clipboard_items();
    if (arrPtr === null) return;
    const base = new Deno.UnsafePointerView(arrPtr);

    const items: string[] = [];
    for (let i = 0; i < count; i++) {
        const ptr = base.getPointer(i * 8);
        if (ptr === null) continue;
        const str = new Deno.UnsafePointerView(ptr).getCString();
        items.push(str);
    }

    items.forEach((str, i) => {
        console.log(`${i + 1}: ${str}`);
    });

    lib.symbols.free_clipboard_items(arrPtr, count);
};

if (import.meta.main) {
    main();
}
