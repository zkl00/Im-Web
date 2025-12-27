<template>
	<el-dialog v-dialogDrag title="添加好友" :visible.sync="dialogVisible" width="400px" :before-close="onClose"
		custom-class="add-friend">
		<el-input placeholder="输入用户ID按下enter搜索" class="input-with-select" v-model="searchText" size="small"
			@keyup.enter.native="onSearch()">
			<i class="el-icon-search el-input__icon" slot="suffix" @click="onSearch()"> </i>
		</el-input>
		<el-scrollbar style="height:400px">
			<div v-for="(user) in users" :key="user.id" v-show="user.id != userStore.userInfo.id">
				<div class="item">
					<div class="avatar">
						<head-image :name="user.nickName" :url="user.headImage" :online="user.online"></head-image>
					</div>
					<div class="friend-info">
						<div class="nick-name">
							<div>{{ user.nickName }}</div>
							<div :class="user.online ? 'online-status  online' : 'online-status'">{{
								user.online ? "[在线]" : "[离线]" }}</div>
						</div>
						<div class="user-name">
							<div>用户名:{{ user.userName }}</div>
						</div>
					</div>
					<el-button type="primary" size="mini" v-show="!isFriend(user.id)"
						@click="onAddFriend(user)">添加</el-button>
					<el-button type="info" size="mini" v-show="isFriend(user.id)" plain disabled>已添加</el-button>
				</div>
			</div>
		</el-scrollbar>
	</el-dialog>
</template>

<script>
import HeadImage from '../common/HeadImage.vue'


export default {
	name: "addFriend",
	components: { HeadImage },
	data() {
		return {
			users: [],
			searchText: ""
		}
	},
	props: {
		dialogVisible: {
			type: Boolean
		}
	},
	methods: {
		onClose() {
			this.$emit("close");
		},
		onSearch() {
			if (!this.searchText) {
				this.users = [];
				return;
			}
			// 通过用户ID搜索
			this.$http({
				url: "/user/get_users_info",
				method: "POST",
				data: {
					userIDs: [this.searchText]
				}
			}).then((data) => {
				const usersInfo = data.usersInfo || [];
				this.users = usersInfo.map(u => ({
					id: u.userID,
					nickName: u.nickname,
					userName: u.userID,
					headImage: u.faceURL,
					headImageThumb: u.faceURL,
					online: false
				}));
			}).catch(() => {
				this.users = [];
			})
		},
		onAddFriend(user) {
			const userID = sessionStorage.getItem("userID");
			this.$http({
				url: "/friend/add_friend",
				method: "POST",
				data: {
					fromUserID: userID,
					toUserID: user.id,
					reqMsg: "请求添加您为好友"
				}
			}).then(() => {
				this.$message.success("好友申请已发送，等待对方确认");
			}).catch((e) => {
				if (e?.errCode === 1304) {
					this.$message.warning("已经是好友关系");
				} else {
					this.$message.error("添加失败");
				}
			})
		},
		isFriend(userId) {
			return this.friendStore.isFriend(userId);
		}
	}
}
</script>

<style lang="scss" scoped>
.add-friend {
	.item {
		height: 65px;
		display: flex;
		position: relative;
		padding-left: 15px;
		align-items: center;
		padding-right: 25px;

		.friend-info {
			margin-left: 15px;
			flex: 3;
			display: flex;
			flex-direction: column;
			flex-shrink: 0;
			overflow: hidden;

			.nick-name {
				display: flex;
				flex-direction: row;
				font-weight: 600;
				font-size: 16px;
				line-height: 25px;

				.online-status {
					font-size: 12px;
					font-weight: 600;

					&.online {
						color: #5fb878;
					}
				}
			}

			.user-name {
				display: flex;
				flex-direction: row;
				font-size: 12px;
				line-height: 20px;
			}

		}
	}
}
</style>
