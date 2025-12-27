<template>
  <div class="chat-group-side">
    <div v-show="!group.quit" class="search">
      <el-input placeholder="搜索群成员" v-model="searchText" size="small">
        <i class="el-icon-search el-input__icon" slot="prefix"> </i>
      </el-input>
    </div>
    <el-scrollbar v-show="!group.quit" ref="scrollbar" :style="'height: ' + scrollHeight + 'px'">
      <div class="member-list">
        <div class="member-tools">
          <div class="tool-btn" title="邀请好友进群聊" @click="onInvite()">
            <i class="el-icon-plus"></i>
          </div>
          <div class="tool-text">邀请</div>
          <add-group-member ref="addGroupMember" :groupId="group.id" :members="groupMembers"
            @reload="$emit('reload')"></add-group-member>
        </div>
        <div class="member-tools" v-if="canManage">
          <div class="tool-btn" title="选择成员移出群聊" @click="onRemove()">
            <i class="el-icon-minus"></i>
          </div>
          <div class="tool-text">移除</div>
          <group-member-selector ref="removeSelector" title="选择成员进行移除" :group="group"
            @complete="onRemoveComplete"></group-member-selector>
        </div>
        <div v-for="(member, idx) in showMembers" :key="member.id">
          <group-member v-if="idx < showMaxIdx" class="group-side-member" :member="member"></group-member>
        </div>
      </div>
    </el-scrollbar>
    <el-divider v-if="!group.quit" content-position="center"></el-divider>
    <el-form labelPosition="top" class="form" :model="group" size="small">
      <el-form-item label="群聊名称">
        <el-input v-model="group.name" disabled maxlength="20"></el-input>
      </el-form-item>
      <el-form-item label="群主">
        <el-input :value="ownerName" disabled></el-input>
      </el-form-item>
      <el-form-item label="群公告">
        <el-input v-model="group.notice" disabled type="textarea" maxlength="1024"></el-input>
      </el-form-item>
      <el-form-item label="备注">
        <el-input v-model="group.remarkGroupName" :disabled="!editing" maxlength="20"></el-input>
      </el-form-item>
      <el-form-item label="我在本群的昵称">
        <el-input v-model="group.remarkNickName" :disabled="!editing" maxlength="20"></el-input>
      </el-form-item>
      <div v-show="!group.quit" class="btn-group">
        <el-button v-if="editing" type="success" @click="onSaveGroup()">保存</el-button>
        <el-button v-if="!editing" type="primary" @click="editing = !editing">编辑</el-button>
        <el-button type="danger" v-show="!isOwner" @click="onQuit()">退出群聊</el-button>
      </div>
    </el-form>
  </div>
</template>

<script>
import AddGroupMember from '../group/AddGroupMember.vue';
import GroupMember from '../group/GroupMember.vue';
import GroupMemberSelector from '../group/GroupMemberSelector.vue';

export default {
  name: "chatGroupSide",
  components: {
    AddGroupMember,
    GroupMember,
    GroupMemberSelector
  },
  data() {
    return {
      searchText: "",
      editing: false,
      showMaxIdx: 50
    }
  },
  props: {
    group: {
      type: Object
    },
    groupMembers: {
      type: Array
    }
  },
  methods: {
    onClose() {
      this.$emit('close');
    },
    onInvite() {
      this.$refs.addGroupMember.open()
    },
    onRemove() {
      // 群主不显示
      let hideIds = [this.group.ownerId];
      this.$refs.removeSelector.open(50, [], [], hideIds);
    },
    onRemoveComplete(members) {
      let userIds = members.map(m => m.userId);
      // V10 API: /group/kick_group
      this.$http({
        url: "/group/kick_group",
        method: 'POST',
        data: {
          groupID: String(this.group.id),
          kickedUserIDs: userIds
        }
      }).then(() => {
        this.$emit('reload');
        this.$message.success(`您移除了${userIds.length}位成员`);
      })
    },
    loadGroupMembers() {
      // V10 API: /group/get_group_member_list
      this.$http({
        url: '/group/get_group_member_list',
        method: "POST",
        data: {
          groupID: String(this.group.id),
          pagination: {
            pageNumber: 1,
            showNumber: 500
          }
        }
      }).then((data) => {
        const members = (data?.members || []).map(m => ({
          userId: m.userID,
          nickName: m.nickname,
          showNickName: m.nickname,
          headImage: m.faceURL,
          remark: '',
          roleLevel: m.roleLevel  // 100:群主, 60:管理员, 20:普通成员
        }));
        this.groupMembers = members;
      })
    },
    onSaveGroup() {
      let vo = this.group;
      // V8 API 格式
      let v8Data = {
        groupID: vo.id,
        groupName: vo.name,
        notification: vo.notice,
        introduction: vo.remark,
        faceURL: vo.headImage
      };
      this.$http({
        url: "/group/set_group_info_ex",
        method: "post",
        data: v8Data
      }).then(() => {
        this.editing = !this.editing
        // V8 接口不返回群信息，使用本地数据更新
        this.groupStore.updateGroup(vo);
        this.$emit('reload');
        this.$message.success("修改成功");
      })
    },
    onQuit() {
      this.$confirm('退出群聊后将不再接受群里的消息，确认退出吗？', '确认退出?', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        // V8 API 格式
        this.$http({
          url: '/group/quit_group',
          method: 'post',
          data: {
            groupID: this.group.id,
            userID: this.mine.id
          }
        }).then(() => {
          this.groupStore.removeGroup(this.group.id);
          this.chatStore.removeGroupChat(this.group.id);
        });
      })
    },
    onScroll(e) {
      const scrollbar = e.target;
      // 滚到底部
      if (scrollbar.scrollTop + scrollbar.clientHeight >= scrollbar.scrollHeight - 30) {
        if (this.showMaxIdx < this.showMembers.length) {
          this.showMaxIdx += 30;
        }
      }
    }
  },
  computed: {
    mine() {
      return this.userStore.userInfo;
    },
    ownerName() {
      let member = this.groupMembers.find((m) => m.userId == this.group.ownerId);
      return member && member.showNickName;
    },
    // 当前用户在群中的角色等级：100=群主, 60=管理员, 20=普通成员
    myRoleLevel() {
      const myId = this.mine.id;
      const member = this.groupMembers.find(m => m.userId == myId);
      return member ? member.roleLevel : 20;
    },
    // 是否是群主
    isOwner() {
      return this.myRoleLevel === 100;
    },
    // 是否有管理权限（群主或管理员）
    canManage() {
      return this.myRoleLevel >= 60;
    },
    showMembers() {
      return this.groupMembers.filter((m) => !m.quit && m.showNickName.includes(this.searchText))
    },
    scrollHeight() {
      return Math.min(400, 80 + this.showMembers.length / 5 * 80);
    }
  },
  mounted() {
    let scrollWrap = this.$refs.scrollbar.$el.querySelector('.el-scrollbar__wrap');
    scrollWrap.addEventListener('scroll', this.onScroll);
  }
}
</script>

<style lang="scss" scoped>
.chat-group-side {
  position: relative;

  .search {
    padding: 10px;
  }

  .el-divider--horizontal {
    margin: 0;
  }

  .el-form-item {
    margin-bottom: 0px !important;
  }

  .member-list {
    padding: 10px;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    font-size: 14px;
    text-align: center;

    .group-side-member {
      margin-left: 5px;
    }

    .member-tools {
      display: flex;
      flex-direction: column;
      align-items: center;
      width: 54px;
      margin-left: 5px;

      .tool-btn {
        width: 38px;
        height: 38px;
        line-height: 38px;
        border: var(--im-border);
        font-size: 14px;
        cursor: pointer;
        box-sizing: border-box;

        &:hover {
          border: #aaaaaa solid 1px;
        }
      }

      .tool-text {
        font-size: 12px;
        text-align: center;
        width: 100%;
        height: 30px;
        line-height: 30px;
        white-space: nowrap;
        text-overflow: ellipsis;
        overflow: hidden
      }
    }
  }

  .form {
    text-align: left;
    padding: 10px;
    height: 30%;

    .el-form-item {
      margin-bottom: 12px;

      .el-form-item__label {
        padding: 0;
        line-height: 30px;
      }

      .el-textarea__inner {
        min-height: 100px !important;
      }
    }

    .el-input__inner,
    .el-textarea__inner {
      color: var(--im-text-color) !important;
    }


    .btn-group {
      text-align: center;
      margin-top: 12px;
    }
  }
}
</style>
