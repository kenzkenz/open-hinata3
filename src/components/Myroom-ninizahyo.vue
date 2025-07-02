<template>
  <v-card>
    <div style="margin-bottom: 10px;">

      <v-select class="scrollable-content"
                v-model="pref"
                :items="prefs"
                item-title="prefName"
                item-value="prefId"
                label="都道府県を選択してください"
                outlined
                @update:modelValue="prefChange"
      ></v-select>

<!--      <v-tabs mobile-breakpoint="0" v-model="tab" class="custom-tabs">-->
<!--        <v-tab value="0"></v-tab>-->
<!--        <v-tab value="28">兵庫県</v-tab>-->
<!--        <v-tab value="45">宮崎県</v-tab>-->
<!--      </v-tabs>-->
<!--      <v-window v-model="tab">-->
<!--        <v-window-item value="45">-->
<!--          <v-card>-->


<!--          </v-card>-->
<!--        </v-window-item>-->
<!--      </v-window>-->

<!--      <div-->
<!--          style="height: 50px;"-->
<!--          v-for="item in sortedGroupLayers"-->
<!--          :key="item.id"-->
<!--          class="data-container"-->
<!--          :class="{ 'selected': selectedLayerId === item.id }"-->
<!--          @click="selectLayer(item.name, item.id)"-->
<!--      >-->
<!--        <div v-if="item.name">-->
<!--          <v-chip-->
<!--              v-if="item.features?.length ?? 0"-->
<!--              class="file-count-badge"-->
<!--              size="small"-->
<!--              color="navy"-->
<!--              text-color="white"-->
<!--          >-->
<!--            {{ item.features?.length ?? 0 }}-->
<!--          </v-chip>-->
<!--          <span v-else style="color: red;">new </span>-->
<!--          <button class="close-btn" @click.stop="deleteLayer(item.id)">×</button>-->
<!--          <span v-html="'<strong>' + item.name + '</strong>_' + item.nickName + 'が作成_' + readableTime(item.createdAt)"></span>-->
<!--        </div>-->
<!--      </div>-->
    </div>
  </v-card>
</template>

<script>


export default {
  name: 'myroom-ninizahyo',
  props: {
    layerName: {
      type: String,
      default: ''
    },
    mapInstance: {
      type: Object,
      default: null // マップが不要な場合に対応
    }
  },
  data: () => ({
    // tab:45,
    pref: '45',
    prefs: [
      {prefId: '28',prefName:'兵庫県'},
      {prefId: '45',prefName:'宮崎県'},
    ]
  }),
  computed: {

  },
  methods: {
    prefChange() {

    }
  },
  watch:{
  },
  mounted() {
  }
}
</script>

<style scoped>
.data-container {
  padding: 5px;
  border: 1px solid #ddd;
  margin-bottom: 5px;
  position: relative;
  cursor: pointer;
  background-color: rgba(132,163,213,0.3);
}
.data-container:hover {
  background-color: #f0f8ff;
}
.close-btn {
  position: absolute;
  top: -10px;
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
.data-container.selected {
  background-color: #b2ebf2;
}
.file-count-badge {
  margin-left: 4px;
  font-size: 10px;
  font-weight: bold;
  min-width: 16px;
  height: 16px;
  line-height: 16px;
  padding: 0 4px;
}
</style>