export type Error = { msg: string };
export type Result<T, E> = T | E;

export const errorify = (err: string): Error => ({
    msg: `
⚠️ Error:

${err}

Please report an issue at https://github.com/Borrus-sudo/cf/issues if you think this is a bug 🐞
`,
});
