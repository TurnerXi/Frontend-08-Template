const fs = require('fs');
const { resolve } = require('path');
const path = require('path');
const util = require('util');
const exec = util.promisify(require('child_process').exec);


const data = fs.readFileSync('./repos.txt', 'utf8');
const list = data.trim().split('\r\n').map(row => {
    if (row.startsWith('#')) return false;
    const [n, g, name, repo] = row.split(/\s+/);
    return { n, g, name, repo, dirname: g + '组' + '_' + name }
}).filter(Boolean);

function resolveDir(dirname) {
    return path.resolve(__dirname, dirname);
}

async function clone(item, isForce) {
    const dirname = resolveDir(item.dirname);
    if (fs.existsSync(dirname)) {
        if (isForce) {
            fs.rmdirSync(dirname)
        } else {
            return 'alreay exists';
        }
    }
    try {
        await exec(`git clone ${item.repo} ${dirname}`, {
            cwd: './'
        });
        console.log(item.repo + 'is cloned');
        return 'cloned';
    } catch (e) {
        console.error(e);
        return 'clone error';
    }

}

async function pull(item) {
    const dirname = resolveDir(item.dirname);
    if (fs.existsSync(dirname)) {
        try {
            await exec(`git -C ${dirname} reset --hard `, { cwd: './' })
            const echo = await exec(`git -C ${dirname} pull`, { cwd: './' })
            if (echo.stdout.trim() === 'Already up to date.') {
                console.log('\033[32m%s\x1B[0m', item.name + ' : ' + item.repo + ' : ' + echo.stdout.replace(/\n$/, ''));
                return 'not modified'
            } else {
                console.log('\033[33m%s\x1B[0m', item.name + ' : ' + item.repo + ' : ');
                console.log('\033[33m%s\x1B[0m', echo.stdout.replace(/\n$/, ''))
                return 'modified'
            }
        } catch (e) {
            console.log('\x1B[31m%s\x1B[0m', item.name + ' : ' + item.repo + ' : ' + e.stderr.replace(/\n$/, ''));
            if (e.stderr.indexOf('SSL_ERROR_SYSCALL') > -1) {
                return await pull(item);
            } else {
                return 'pull error';
            }
        }
    } else {
        return await clone(item);
    }
}

function createHtmlTable(rows) {
    let html = [];
    for (const item of rows) {
        html.push(`<tr>${item.map(item => `<td>${item}</td>`).join('')}</tr>`)
    }
    const tpl = fs.readFileSync('table.tpl', 'utf8');
    fs.writeFileSync('temp.html', tpl.replace('{{content}}', html.join('')), 'utf8');
}

async function main(argv) {
    if (argv[2] === 'clone') {
        for (const item of list) {
            clone(item, argv[3] === '-f');
        }
    } else if (argv[2] === 'pull') {
        Promise.all(list.map(item => pull(item).then(result => ({ ...item, result })))).then((datas) => {
            console.log(
                datas.filter(data => data.result === 'modified' || data.result === 'cloned')
                .map(item => `${item.n} ${item.g} ${item.name}`)
                .join('\r\n')
            );
        })
    } else if (argv[2] === 'ex' && argv[3]) {
        const dir = fs.readdirSync(argv[3], 'utf8');
        const files = dir.reduce((map, name) => {
            const [id, n, lesson] = name.split(/[-\.]/);
            if (!map[n]) map[n] = [];
            map[n].push({ id, ex: fs.readFileSync(path.resolve(__dirname, argv[3], name)), lesson, ext: name.split('.').pop() });
            map[n].sort((a, b) => a.lesson - b.lesson);
            return map;
        }, {});
        const res = list.reduce((total, item) => {
            for (const { id, ex, lesson, ext } of files[item.n] || []) {
                if (!id) {
                    total.push(['404', item.n, item.g, item.name]);
                } else if (ext === 'html') {
                    total.push([id, item.n, item.g, item.name, `<a href="javascript:openURL('data:text/html;charset=utf-8;base64,${ex.toString('base64')}')" >第${lesson}节</a>`]);
                } else {
                    total.push([id, item.n, item.g, item.name, `<a href="javascript:openURL('data:text/javascript;charset=utf-8;base64,${ex.toString('base64')}')" >第${lesson}节</a>`]);
                }
            }
            return total;
        }, []).sort((a, b) => (a[2] - b[2]) || (a[3] > b[3] ? -1 : 1));
        createHtmlTable(res);
    }
}
// console.log(list);

main(process.argv)