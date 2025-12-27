<template>
	<div class="login-view">
		<div class="login-card">
			<div class="left-side">
				<div class="promo-content">
					<div class="glass-card card-1">
						<div class="text">进度同步到云端了吗？</div>
					</div>
					<div class="glass-card card-2">
						<div class="text">多端多平台共享，随时可加入协作。</div>
					</div>
					<div class="glass-card card-3">
						<div class="text">太棒了，保持高效节奏！</div>
					</div>
					<div class="stat-card">
						<div class="percentage">99.9%</div>
						<div class="label">消息送达率</div>
					</div>
					<div class="bottom-tags">
						<div class="tag">统一多端体验</div>
						<div class="tag">企业级安全保障</div>
					</div>
				</div>
			</div>

			<div class="right-side">
				<div class="form-container">
					<div class="header">
						<h1 class="welcome-text">欢迎使用 Kklm</h1>
						<p class="sub-text">请输入账号信息完成登录</p>
					</div>

					<div class="auth-toggle">
						<div class="toggle-bg"></div>
						<div class="toggle-item active">登录</div>
						<div class="toggle-item" @click="$router.push('/register')">注册</div>
					</div>

					<div class="login-tip">
						使用已有账号登录 Kklm。
					</div>

					<el-form class="login-form" :model="loginForm" :rules="rules" ref="loginForm"
						@keyup.enter.native="submitForm('loginForm')">

						<div class="input-label">用户 ID</div>
						<el-form-item prop="userID">
							<el-input v-model="loginForm.userID" placeholder="请输入用户ID"
								class="custom-input"></el-input>
						</el-form-item>

						<div class="input-label">密码</div>
						<el-form-item prop="password">
							<el-input type="password" v-model="loginForm.password" placeholder="******"
								class="custom-input" show-password></el-input>
						</el-form-item>

						<el-form-item class="submit-item">
							<el-button type="primary" class="submit-btn" @click="submitForm('loginForm')">登录</el-button>
						</el-form-item>

						<div class="footer-links">
							<span>这里需要输入账号与密码；首次使用可以换至“注册”创建账号。</span>
						</div>
					</el-form>
				</div>
			</div>
		</div>
		<div class="icp-container">
			<icp></icp>
		</div>
	</div>
</template>

<script>
import Icp from '../components/common/Icp.vue'

export default {
	name: "login",
	components: {
		Icp
	},
	data() {
		var checkUsername = (rule, value, callback) => {
			if (!value) {
				return callback(new Error('请输入用户ID'));
			}
			callback();
		};
		var checkPassword = (rule, value, callback) => {
			if (value === '') {
				callback(new Error('请输入密码'));
			}
			callback();
		};
		return {
			loginForm: {
				userID: '',
				platformID: 5, // 5表示Web平台
				password: ''
			},
			rules: {
				userID: [{
					validator: checkUsername,
					trigger: 'blur'
				}],
				password: [{
					validator: checkPassword,
					trigger: 'blur'
				}]
			}
		};
	},
	methods: {
		submitForm(formName) {
			this.$refs[formName].validate((valid) => {
				if (valid) {
					this.$http({
						url: "/user/self_login",
						method: 'post',
						data: {
							userID: this.loginForm.userID,
							platformID: this.loginForm.platformID,
							password: this.loginForm.password
						}
					}).then((data) => {
						// 从接口响应获取 userID
						const userID = data.userID || this.loginForm.userID;
						// 保存用户ID到cookie
						this.setCookie('userID', userID);
						this.setCookie('password', this.loginForm.password);
						// 保存token和userID到sessionStorage
						sessionStorage.setItem("token", data.token);
						sessionStorage.setItem("userID", userID);
						if (data.expireTimeSeconds) {
							sessionStorage.setItem("tokenExpire", data.expireTimeSeconds);
						}
						this.$message.success("登录成功");
						this.$router.push("/home/chat");
					})
				}
			});
		},
		getCookie(name) {
			let reg = new RegExp("(^| )" + name + "=([^;]*)(;|$)");
			let arr = document.cookie.match(reg)
			if (arr) {
				return unescape(arr[2]);
			}
			return '';
		},
		setCookie(name, value) {
			document.cookie = name + "=" + escape(value);
		}
	},
	mounted() {
		this.loginForm.userID = this.getCookie("userID");
		this.loginForm.password = this.getCookie("password");
	}
}
</script>

<style scoped lang="scss">
.login-view {
	width: 100%;
	height: 100%;
	display: flex;
	justify-content: center;
	align-items: center;
	background-color: #f0f5ff;
	/* Light blue background */
	position: relative;
	flex-direction: column;
}

.login-card {
	width: 1000px;
	height: 600px;
	background: #fff;
	border-radius: 24px;
	box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
	display: flex;
	overflow: hidden;
	margin-bottom: 20px;
}

.left-side {
	width: 45%;
	background: linear-gradient(135deg, #aaccff 0%, #6699ff 100%);
	position: relative;
	display: flex;
	justify-content: center;
	align-items: center;
}

.promo-content {
	position: relative;
	width: 100%;
	height: 100%;
}

/* Glassmorphism Cards */
.glass-card {
	position: absolute;
	background: rgba(255, 255, 255, 0.85);
	backdrop-filter: blur(10px);
	border-radius: 12px;
	padding: 12px 20px;
	box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
	font-size: 14px;
	color: #333;
	width: max-content;
}

.card-1 {
	top: 25%;
	left: 15%;
	animation: float 6s ease-in-out infinite;
	border-bottom-left-radius: 0;
}

.card-2 {
	top: 38%;
	left: 25%;
	background: #3b82f6;
	color: white;
	animation: float 7s ease-in-out infinite 1s;
	border-top-right-radius: 0;
}

.card-3 {
	top: 50%;
	left: 10%;
	animation: float 8s ease-in-out infinite 2s;
	border-bottom-left-radius: 0;
}

.stat-card {
	position: absolute;
	bottom: 20%;
	left: 15%;
	background: #1e293b;
	color: white;
	padding: 15px;
	border-radius: 12px;
	width: 120px;
	box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
}

.stat-card .percentage {
	font-size: 24px;
	font-weight: bold;
	margin-bottom: 5px;
}

.stat-card .label {
	font-size: 12px;
	opacity: 0.8;
}

.bottom-tags {
	position: absolute;
	bottom: 20%;
	right: -20px;
	display: flex;
	flex-direction: column;
	gap: 10px;
}

.tag {
	background: rgba(255, 255, 255, 0.3);
	padding: 5px 10px;
	border-radius: 4px;
	color: white;
	font-size: 12px;
	backdrop-filter: blur(4px);
}

@keyframes float {
	0% {
		transform: translateY(0px);
	}

	50% {
		transform: translateY(-10px);
	}

	100% {
		transform: translateY(0px);
	}
}

.right-side {
	width: 55%;
	padding: 60px;
	display: flex;
	flex-direction: column;
	justify-content: center;
}

.form-container {
	width: 100%;
	max-width: 400px;
	margin: 0 auto;
}

.header {
	margin-bottom: 30px;
}

.welcome-text {
	font-size: 28px;
	font-weight: bold;
	color: #1e293b;
	margin-bottom: 10px;
}

.sub-text {
	color: #64748b;
	font-size: 14px;
}

.auth-toggle {
	background: #f1f5f9;
	border-radius: 8px;
	padding: 5px;
	display: flex;
	margin-bottom: 20px;
	position: relative;
}

.toggle-item {
	flex: 1;
	text-align: center;
	padding: 10px 0;
	font-size: 14px;
	cursor: pointer;
	color: #64748b;
	position: relative;
	z-index: 2;
	transition: color 0.3s;
}

.toggle-item.active {
	color: #3b82f6;
	background: white;
	border-radius: 6px;
	box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
	font-weight: 500;
}

.login-tip {
	background: #f8fafc;
	border: 1px solid #e2e8f0;
	border-radius: 8px;
	padding: 10px 15px;
	color: #64748b;
	font-size: 13px;
	margin-bottom: 20px;
}

.input-label {
	font-size: 14px;
	color: #334155;
	margin-bottom: 8px;
	margin-top: 15px;
}

::v-deep .custom-input .el-input__inner {
	background: #f8fafc;
	border: 1px solid #e2e8f0;
	border-radius: 8px;
	height: 44px;
	line-height: 44px;
	padding-left: 15px;
	transition: all 0.3s;
}

::v-deep .custom-input .el-input__inner:focus {
	border-color: #3b82f6;
	background: white;
}

.submit-item {
	margin-top: 30px;
}

.submit-btn {
	width: 100%;
	height: 44px;
	border-radius: 8px;
	background-color: #2563eb;
	border-color: #2563eb;
	font-size: 16px;
	font-weight: 500;
}

.submit-btn:hover {
	background-color: #1d4ed8;
	border-color: #1d4ed8;
}

.footer-links {
	margin-top: 15px;
	font-size: 12px;
	color: #94a3b8;
	text-align: center;
	line-height: 1.5;
}

.icp-container {
	font-size: 12px;
	color: #999;
}
</style>