import { type Result, type Error, errorify, Tasks, info } from './utils.ts';
import * as path from '@std/path';
import * as fs from '@std/fs';
import colors from 'yoctocolors';
import { Clippy } from './deps.ts';

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
        return {
            msg: `Could not retrieve the clipboard history, make sure the Clipboard History is on, press "Win + V" for the same`,
        };

    const base = new Deno.UnsafePointerView(arrPtr);

    const items: string[] = [];
    for (let i = 0; i < count; i++) {
        const ptr = base.getPointer(i * 8);
        if (ptr === null) continue;
        const str = new Deno.UnsafePointerView(ptr).getCString();
        items.push(str);
    }

    if (!items.length)
        return {
            msg: 'Please copy the expected input and output into the clipboard. If you have done so, try making sure that getClipboardHistory is on by pressing "Win + V"',
        };

    lib.symbols.free_clipboard_items(arrPtr, count);

    return items;
};

const parseArgs = async (): Promise<
    Result<{ code: string; loc: string }, Error>
> => {
    const args = Deno.args;
    if (!args.length) return { msg: 'Please pass the filename!' };
    const loc = path.join(
        Deno.cwd(),
        args[0].endsWith('.cpp') ? args[0] : args[0] + '.cpp'
    );
    const exists = await fs.exists(loc);
    if (!exists) return { msg: `File not found at location ${loc}` };
    const code = await Deno.readTextFile(loc);
    return { code, loc };
};

const getIO = (
    clipHist: string[]
): Result<{ inp: string[]; out: string[]; tcs: number }, Error> => {
    let inp: string[] = [];
    let out: string[] = [];
    let tcs = -1;

    // LATEST at the idx 0 in clipHist and so on ...

    for (let idx = 0; idx < clipHist.length; idx++) {
        const textLines = clipHist[idx].trim().split('\n');

        if (!isNaN(parseInt(textLines[0].trim()))) {
            const realNoLines = textLines.length;
            inp = textLines;
            let buffOut = [];
            let expectedTcs = parseInt(textLines[0].trim());

            if ((realNoLines - 1) % expectedTcs == 0) {
                // We get the latest at the front and we prefer the behind ones
                if (idx + 1 < clipHist.length) {
                    buffOut = clipHist[idx + 1].trim().split('\n');
                    if (buffOut.length % expectedTcs == 0) {
                        out = buffOut;
                    }
                }
                if (idx - 1 >= 0) {
                    buffOut = clipHist[idx - 1].trim().split('\n');
                    if (buffOut.length % expectedTcs == 0) {
                        out = buffOut;
                    }
                }
            } else if (
                textLines[1] &&
                textLines[1].split(' ').length == expectedTcs
            ) {
                if (idx + 1 < clipHist.length) {
                    buffOut = [clipHist[idx + 1].trim()];
                    if (!isNaN(parseInt(clipHist[idx + 1].trim()))) {
                        out = buffOut;
                        expectedTcs = -1; // sentinel value (very hacky), this is the exit condition, hence fine
                    }
                }
                if (idx - 1 >= 0) {
                    buffOut = [clipHist[idx + 1].trim()];
                    if (!isNaN(parseInt(clipHist[idx + 1].trim()))) {
                        out = buffOut;
                        expectedTcs = -1; // sentinel value (very hacky), this is the exit condition, hence fine
                    }
                }
            }

            if (out.length > 0) {
                tcs = expectedTcs;
                break;
            }
        }
    }

    if (!inp.length || !out.length) {
        // fallback to the first clip history
        // INPUT at 1 and OUTPUT at 0
        const potentialInput = clipHist[1] ?? '';
        const potentialOutput = clipHist[0] ?? '';
        if (!isNaN(parseInt(potentialInput.split('\n')[1].trim()))) {
            return {
                inp: potentialInput.split('\n'),
                out: potentialOutput.split('\n'),
                tcs: -2,
            };
        }
        return {
            msg: 'Please make sure that the input and output have been copied to the clipboard, make a fresh copy and try again!',
        };
    }

    return { inp, out, tcs };
};

type ExecParams = { inp: string; fileLoc: string };
const exec = async ({
    inp,
    fileLoc,
}: ExecParams): Promise<Result<string, Error>> => {
    const exec1 = 'g++';
    const exec2 = fileLoc.replace('.cpp', '.exe');

    // Compiling the file, returning compiler errors if any

    const cmd1 = new Deno.Command(exec1, {
        args: [fileLoc, '-o', exec2],
        stderr: 'piped',
        stdout: 'piped',
    });
    const { success, stderr } = await cmd1.output();
    if (!success) return { msg: new TextDecoder().decode(stderr) };

    // Running the exe, simulating input, returning errors if possible or the output

    const cmd2 = new Deno.Command(exec2, {
        stderr: 'piped',
        stdin: 'piped',
        stdout: 'piped',
    });
    const child = cmd2.spawn();
    const writer = child.stdin.getWriter();
    await writer.write(new TextEncoder().encode(inp));
    await writer.close();
    const payload = await child.output();
    if (!payload.success)
        return { msg: new TextDecoder().decode(payload.stderr) };

    return new TextDecoder().decode(payload.stdout);
};

type DiffStringsParams = {
    expected: string[];
    received: string[];
    tcs: number;
};
const printDiff = ({ expected, received, tcs }: DiffStringsParams): void => {
    // we have to judge the number of testcase, and make that our increment count
    if (tcs > 0) {
        // sentinel value hack
        let failedTC = 0;

        const outputInc = expected.length / tcs;

        for (let i = 0; i < expected.length; i += outputInc) {
            let allMatched = true;
            let expectedStitch = '';
            let receivedStitch = '';

            // TC wise checking to give the appropriate failed test cases
            for (let k = i; k < i + outputInc; k++) {
                expectedStitch += expected[k] + '\n';
                receivedStitch += (received[k] ?? '<EXPECTED OUTPUT>') + '\n';

                if (expected[k].trim() != received[k].trim()) {
                    allMatched = false;
                }
            }

            if (!allMatched) {
                failedTC++;
                console.log(`Failed Test Case Number: ${i / outputInc + 1}`);
                console.log('Expected: ');
                console.log(colors.green(expectedStitch.trim()));
                console.log('Received: ');
                console.log(colors.red(receivedStitch.trim()));
                console.log();
            }
        }
        console.log(
            `✅ (${colors.green(
                `${tcs - failedTC} / ${tcs}`
            )})  ❌ (${colors.red(`${failedTC} / ${tcs}`)}) `
        );
    } else {
        if (expected == received) {
            console.log('✅ All Passed');
        } else if (tcs == -1) {
            console.log('❌ Testcase failed');
            console.log('Expected: ');
            console.log(colors.green(expected.join('')));
            console.log('Received: ');
            console.log(colors.red(received.join('')));
        } else {
            console.log(colors.red('❌ Some or all testcases have failed!'));
        }
    }
};

const copyToClipboard = async (
    contents: string
): Promise<Result<void, Error>> => {
    try {
        await Clippy.writeText(contents);
    } catch (_) {
        return {
            msg: 'Failed to copy contents to the clipboard, DIY',
        };
    }
};

const isError = (inp: unknown): inp is Error =>
    typeof inp == 'object' && inp != null && 'msg' in inp;

if (import.meta.main) {
    const tasks = Tasks();

    // TASK 1
    tasks.createTask('Fetching CF Input/Output');
    const items = getClipboardHistory();

    if (isError(items)) {
        tasks.failTask(errorify(items.msg));
        Deno.exit();
    }

    const io = getIO(items);

    if (isError(io)) {
        tasks.failTask(errorify(io.msg));
        Deno.exit();
    } else {
        tasks.succeedTask();
    }

    // TASK 2
    tasks.createTask('Fetching the file: ');
    const file = await parseArgs();

    if (isError(file)) {
        tasks.failTask(errorify(file.msg));
        Deno.exit();
    } else {
        tasks.succeedTask();
    }

    // Task 3
    tasks.createTask('Executing code!');
    const received = await exec({ inp: io.inp.join('\n'), fileLoc: file.loc });

    if (isError(received)) {
        tasks.failTask(errorify(received.msg));
        Deno.exit();
    } else {
        tasks.succeedTask();
    }

    printDiff({
        expected: io.out,
        received: received.split('\n'),
        tcs: io.tcs,
    });

    // Task 4
    tasks.createTask('Copying code!!!');
    const res = await copyToClipboard(file.code);
    if (isError(res)) {
        tasks.infoTask(info(res.msg));
        Deno.exit();
    } else {
        tasks.succeedTask();
    }
}
