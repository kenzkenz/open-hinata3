<template>
  <v-card>
    <v-card>
      <v-text-field v-model="pmtilesRename" type="text" placeholder="リネーム"></v-text-field>
      <v-btn style="margin-top: -10px;margin-bottom: 10px" @click="pmtilesRenameBtn">リネーム</v-btn>
      <div v-for="item in jsonDataPmtiles" :key="item.id" class="data-container" @click="pmtilesClick(item)">
        <button class="close-btn" @click="removePmtiles(item.id,item.url2,$event)">×</button>
        <strong>{{ item.name }}</strong><br>
      </div>
    </v-card>
  </v-card>
</template>

<script>

import axios from "axios";
import {user} from "@/authState";
import {userPmtile0Set} from "@/js/downLoad";
import store from "@/store";

export default {
  name: "myroom-pmtiles",
  props: {
    layerName: String,
    mapInstance: Object,
  },
  components: {
  },
  data: () => ({
    pmtilesRename: '',
    id: '',
    name: '',
    jsonDataPmtiles: [],
    rows: [],
    filteredRows: [],
    filterText: "",
    selectedRowIndex: null,
  }),
  computed: {
    s_dialogForLink: {
      get() {
        return this.$store.state.dialogForLink
      },
      set(value) {
        this.$store.state.dialogForLink = value
      }
    },
    s_fetchImagesFire : {
      get() {
        return this.$store.state.fetchImagesFire
      },
      set(value) {
        this.$store.state.fetchImagesFire = value
      }
    },
  },
  methods: {
    pmtilesRenameBtn() {
      if (!confirm("変更しますか？")) {
        return
      }
      const vm = this
      if (!this.pmtilesRename) return
      axios.get('https://kenzkenz.xsrv.jp/open-hinata3/php/userPmtiles0Update.php',{
        params: {
          id: this.id,
          name: this.pmtilesRename,
        }
      }).then(function (response) {
        console.log(response)
        vm.pmtilesSelect(vm.$store.state.userId)
      })
    },
    pmtilesClick(item) {
      console.log(this.$store.state.pmtiles0Id,item.id)
      console.log(item)
      const result = this.$store.state.selectedLayers['map01'].find(v => {
        return v.id.includes(`oh-pmtiles-${item.id}`);
      });
      this.$store.state.pmtiles0Id = item.id
      this.$store.state.pmtiles0Name = item.name
      this.$store.state.propnames = JSON.parse(item.propnames)
      this.$store.state.pmtilesLabel = item.label
      this.$store.state.pmtilesStyle = JSON.parse(item.style)
      this.$store.dispatch('showFloatingWindow', 'painteditor')
      this.pmtilesRename = item.name
      this.id = item.id
      this.name = item.name
      if (!result) {
        userPmtile0Set(item.name,item.url,item.id, JSON.parse(item.bbox), item.length, item.label)
      }
    },
    removePmtiles(id, url2, event) {
      event.stopPropagation();  // バブリングを止める
      if (!confirm("削除しますか？")) {
        return
      }
      const vm = this
      console.log(url2)
      async function deleteUserPmtiles(url2) {
        try {
          const response = await axios.post('https://kenzkenz.duckdns.org/myphp/pmtiles_unlink.php', {
            url2: url2
          });

          if (response.data.error) {
            console.error('エラー:', response.data.error);
            alert(`エラー: ${response.data.error}`);
          } else {
            console.log('削除成功:', response.data);
          }
        } catch (error) {
          console.error('リクエストエラー:', error);
        }
      }
      deleteUserPmtiles(url2)

      async function deleteUserData(id) {
        try {
          const response = await axios.get('https://kenzkenz.xsrv.jp/open-hinata3/php/userPmtiles0Delete.php', {
            params: { id: id }
          });
          if (response.data.error) {
            console.error('エラー:', response.data.error);
            alert(`エラー: ${response.data.error}`);
          } else {
            console.log('削除成功:', response.data);
            vm.jsonDataPmtiles = vm.jsonDataPmtiles.filter(item => item.id !== id);
          }
        } catch (error) {
          console.error('通信エラー2:', error);
        }
      }
      deleteUserData(id)
    },
    pmtilesSelect (uid) {
      const vm = this
      async function fetchUserData(uid) {
        try {
          const response = await axios.get('https://kenzkenz.xsrv.jp/open-hinata3/php/userPmtiles0Select.php', {
            params: { uid: uid, isAll: false}
            // params: { uid: uid }
          });
          if (response.data.error) {
            console.error('エラー:', response.data.error);
            alert(`エラー: ${response.data.error}`);
          } else {
            console.log(response.data)
            vm.jsonDataPmtiles = response.data
          }
        } catch (error) {
          console.error('通信エラー:', error);
        }
      }
      fetchUserData(uid)
    },
    applyFilter() {
      if (!this.filterText) {
        this.filteredRows = this.rows.slice(1);
      } else {
        const keyword = this.filterText;
        this.filteredRows = this.rows
            .slice(1)
            .filter((row) => row.some((cell) => cell.includes(keyword)));
      }
      this.selectedRowIndex = null;
    },
  },
  mounted() {
    const checkUser = setInterval(() => {
      if (user.value && user.value.uid) {
        const uid = user.value.uid
        this.uid = uid
        this.$store.state.userId = uid
        this.pmtilesSelect(uid)

        clearInterval(checkUser)
      }
    }, 100) // 5ms → 100ms に変更（CPU負荷軽減のため）
  },
  watch: {
    s_dialogForLink () {
      this.openDialog();
      try {
        document.querySelector('.v-overlay').style.display = 'none'
      } catch (e) {
        console.log(e)
      }
      this.pmtilesSelect(this.$store.state.userId)
    },
    s_fetchImagesFire () {
      try {
        this.pmtilesSelect(this.$store.state.userId)
      } catch (e) {
        console.log(e)
      }
    }
  }
};
</script>

<style scoped>
.data-container {
  padding: 5px;
  border: 1px solid #ddd;
  margin-bottom: 5px;
  position: relative;
  cursor: pointer;
  background-color: rgba(132, 163, 213, 0.3);
}
.data-container:hover {
  background-color: #f0f8ff;
}
/* 選択時は少し濃いめの青に */
.data-container.selected {
  background-color: #4682b4;
  color: white;
}
.close-btn {
  position: absolute;
  top: calc(50% - 15px);
  right: 10px;
  color: black;
  border: none;
  cursor: pointer;
  padding: 5px;
  font-size: 30px;
}
.close-btn:hover {
  color: red;
}
</style>
