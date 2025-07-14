import colors from 'yoctocolors';
import boxen from 'boxen';
import { Kia, Spinners } from './deps.ts';

export type Error = { msg: string };
export type Result<T, E> = T | E;

export const errorify = (err: string): string =>
    boxen(
        `
${colors.whiteBright(err)} 
${colors.italic(
    `Please report an issue at ${colors.underline(
        colors.blue('https://github.com/Borrus-sudo/cf/issues')
    )} if you think this is a bug 🐞`
)}
`,
        {
            title: `⚠️  ${colors.bold(colors.red('Error!'))}`,
            titleAlignment: 'left',
            textAlignment: 'left',
            padding: {
                left: 4,
                right: 4,
                top: 1,
                bottom: 1,
            },
            width: 60,
            margin: 1,
            borderColor: 'yellow',
        }
    );
export const info = (info: string): string =>
    boxen(
        `
${colors.whiteBright(info)} 
${colors.italic(
    `Please report an issue at ${colors.underline(
        colors.blue('https://github.com/Borrus-sudo/cf/issues')
    )} if you think this is a bug 🐞`
)}
`,
        {
            title: `📋 ${colors.bold(colors.whiteBright('Info'))}`,
            titleAlignment: 'left',
            textAlignment: 'left',
            padding: {
                left: 4,
                right: 4,
                top: 1,
                bottom: 1,
            },
            width: 60,
            margin: 1,
            borderColor: 'yellow',
        }
    );

export function Tasks() {
    const spinner = new Kia.default({
        spinner: Spinners.dots8,
    });
    return {
        createTask(title: string) {
            spinner.set({ text: title });
            spinner.start();
        },
        succeedTask() {
            spinner.succeed(`Finished: ${spinner.getText()}`);
        },
        failTask(error: string) {
            spinner.fail(`Failed: ${spinner.getText()}`);
            console.log(error);
        },
        infoTask(info: string) {
            spinner.info('Warning: ');
            console.log(info);
        },
    };
}
