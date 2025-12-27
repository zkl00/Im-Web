const path = require('path')
const fs = require('fs')

module.exports = {
	devServer: {
		proxy: {
			'/api2': {
				target: 'http://59.110.16.114:10002',
				changeOrigin: true,
				ws: false,
				pathRewrite: {
					'^/api2': ''
				}
			}
		}
	}

}