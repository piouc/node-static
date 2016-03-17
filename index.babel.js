import http from 'http'
import url from 'url'
import Path from 'path'
import fs from 'fs'
import mime from 'mime-types'

function statPromise(path){
	return new Promise((resolve, reject) => {
		fs.stat(path, (err, stat) => {
			if(err){
				reject(err)
				return
			}
			resolve({
				name: Path.parse(path).base,
				stats: stat
			})
		})
	})
}

function formatTime(date){
	const m = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Nov', 'Dec']
	return `${m[date.getMonth()]} ${date.getDate()} ${date.getHours()}:${date.getMinutes()}`
}

function numberWithCommas(x) {
	return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}


http.createServer((req, res) => {
	const {pathname: path, query: query} = url.parse(req.url)
	const absolutePath = Path.join(process.cwd(), path)
	fs.stat(absolutePath, (err, stats) => {
		if(err){
			res.writeHead(500)
			res.write(err.message)
			res.end()
			return
		}

		if(stats.isFile()){
			res.writeHead(200, {
				'Content-Type': mime.contentType(Path.extname(path)),
				'Content-Length': stats.size
			})
			fs.createReadStream(absolutePath).pipe(res)
			return
		}

		if(stats.isDirectory()){
			fs.readdir(absolutePath, (err, files) => {
				Promise.all(files.map(p => statPromise(Path.join(absolutePath, p)))).then(files => {
					res.writeHead(200, {
						'Content-Type': 'text/html'
					})
					res.write(`
						<!DOCTYPE html>
						<html lang="en">
							<head>
								<title>${path}</title>
								<style>
									html {
										font-size: 14px;
										font-family: monospace;
									}
									table {
										margin: -0.25rem -1rem
									}
									th {
										text-align:left;
									}
									th, td {
										padding: 0.25rem 1rem;
									}
								</style>
							</head>
							<body>
								<h1>${'<a href="/">/</a>' + Path.normalize(path).replace(/^\//, '').split('/').map((name, i, arr) => `<a href="${'/' + arr.slice(0, ++i).join('/')}">${name}</a>`).join('/')}</h1>
								<table>
									<tr>
										<th>File name</th>
										<th>Last update</th>
										<th style="text-align: right;">size</th>
									</tr>
									${files.map(file => `<tr><td><a href="${Path.join(path, file.name)}">${file.name}</a></td><td>${formatTime(new Date(file.stats.atime))}</td><td style="text-align:right;">${numberWithCommas(file.stats.size)}</td></tr>`).join('')}
								</table>
							</body>
						</html>
					`)
					res.end()
				}, (err) => {
					res.writeHead(500)
					res.write(err.message)
					res.end()
				})
			})
			return
		}

		res.writeHead(404)
		res.write('404 File not found')
		res.end()

	})
}).listen(8080)
