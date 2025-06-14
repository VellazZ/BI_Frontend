<!-- App.vue -->
<template>
  <div id="app">
    <el-container>
      <el-header>
        <h1>新闻数据分析系统</h1>
      </el-header>
      <el-main>
        <el-tabs v-model="activeTab" type="card">
          <el-tab-pane label="新闻生命周期" name="lifecycle">
            <NewsLifecycle />
          </el-tab-pane>
          <el-tab-pane label="新闻分类统计" name="category">
            <CategoryStats />
          </el-tab-pane>
          <el-tab-pane label="用户兴趣分析" name="interest">
            <UserInterests />
          </el-tab-pane>
          <el-tab-pane label="综合查询" name="query">
            <NewsStats />
          </el-tab-pane>
          <el-tab-pane label="爆款分析" name="popular">
            <NewsAnalysis />
          </el-tab-pane>
          <el-tab-pane label="推荐系统" name="recommend">
            <NewsRecommendation />
          </el-tab-pane>
        </el-tabs>
      </el-main>
    </el-container>
  </div>
</template>

<script>
import { ref } from 'vue'
import NewsLifecycle from './components/NewsLifecycle.vue'
import CategoryStats from './components/CategoryStats.vue'
import UserInterests from './components/UserInterests.vue'
import NewsStats from './components/NewsStats.vue'
import NewsAnalysis from './components/NewsAnalysis.vue'
import NewsRecommendation from './components/NewsRecommendation.vue'

export default {
  name: 'App',
  components: {
    NewsLifecycle,
    CategoryStats,
    UserInterests,
    NewsStats,
    NewsAnalysis,
    NewsRecommendation
  },
  setup() {
    const activeTab = ref('lifecycle', 'category', 'UserInterests', 'NewsStats')
    
    return {
      activeTab
    }
  }
}
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.el-header {
  background-color: #545c64;
  color: #fff;
  text-align: center;
  line-height: 60px;
}

.el-header h1 {
  margin: 0;
  font-size: 24px;
}

.el-main {
  padding: 20px;
}
</style>