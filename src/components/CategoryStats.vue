<!-- components/CategoryStats.vue -->
<template>
    <div class="category-stats">
      <el-card>
        <template #header>
          <div class="card-header">
            <span>分类统计分析</span>
          </div>
        </template>
  
        <!-- 查询表单 -->
        <el-form :model="queryForm" :inline="true" class="query-form">
          <el-form-item label="时间范围:">
            <el-date-picker
              v-model="queryForm.timeRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              format="YYYY-MM-DD"
              value-format="X"
              :default-value="defaultTimeRange"
              :picker-options="pickerOptions"
            />
          </el-form-item>
  
          <el-form-item label="分类:">
            <el-select
              v-model="queryForm.categories"
              multiple
              placeholder="请选择分类"
              style="width: 300px;"
            >
              <el-option
                v-for="category in availableCategories"
                :key="category"
                :label="category"
                :value="category"
              />
            </el-select>
          </el-form-item>
  
          <el-form-item>
            <el-button
              type="primary"
              @click="queryStats"
              :loading="loading"
            >
              查询
            </el-button>
            <el-button @click="resetForm">重置</el-button>
          </el-form-item>
        </el-form>
  
        <!-- 结果展示 -->
        <div v-if="chartData.length > 0" class="chart-container">
  
          <div class="charts">
            <el-row :gutter="20">
              <el-col :span="12">
                <div class="chart-wrapper">
                  <h3>分类浏览次数趋势</h3>
                  <v-chart
                    class="chart"
                    :option="browseCountOption"
                    :loading="loading"
                  />
                </div>
              </el-col>
              <el-col :span="12">
                <div class="chart-wrapper">
                  <h3>分类浏览时长趋势</h3>
                  <v-chart
                    class="chart"
                    :option="durationOption"
                    :loading="loading"
                  />
                </div>
              </el-col>
            </el-row>
          </div>
        </div>
  
        <!-- 数据表格 -->
        <div v-if="chartData.length > 0" class="data-table">
          <h3>详细数据</h3>
          <el-table :data="chartData" style="width: 100%">
            <el-table-column prop="day_stamp" label="日期" width="150" />
            <el-table-column prop="category" label="分类" width="150" />
            <el-table-column prop="browse_count" label="浏览次数" width="120" />
            <el-table-column prop="browse_duration" label="总浏览时长(秒)" width="150" />
            <el-table-column label="平均时长(秒)" width="130">
              <template #default="scope">
                {{ scope.row.browse_count > 0 ? (scope.row.browse_duration / scope.row.browse_count).toFixed(2) : 0 }}
              </template>
            </el-table-column>
          </el-table>
        </div>
  
        <!-- 空状态 -->
        <el-empty v-if="!loading && chartData.length === 0 && hasQueried" description="暂无数据" />
      </el-card>
    </div>
  </template>
  
  <script>
  import { ref, reactive, computed } from 'vue'
  import { use } from 'echarts/core'
  import { CanvasRenderer } from 'echarts/renderers'
  import { LineChart } from 'echarts/charts'
  import {
    TitleComponent,
    TooltipComponent,
    LegendComponent,
    GridComponent,
    DataZoomComponent
  } from 'echarts/components'
  import VChart from 'vue-echarts'
  import { ElMessage } from 'element-plus'
  import { newsApi } from '../api/news'
  
  use([
    CanvasRenderer,
    LineChart,
    TitleComponent,
    TooltipComponent,
    LegendComponent,
    GridComponent,
    DataZoomComponent
  ])
  
  export default {
    name: 'CategoryStats',
    components: {
      VChart
    },
    setup() {
      const loading = ref(false)
      const hasQueried = ref(false)
      const chartData = ref([])
  
      // 默认时间范围 (2019-06-13 到 2019-07-03)
      const defaultTimeRange = [
        new Date('2019-06-13').getTime() / 1000,
        new Date('2019-07-03').getTime() / 1000
      ]
  
      // 可选分类列表（可根据实际需求从后端获取）
      const availableCategories = ref(['entertainment', 'movies', 'autos', 'finance', 'foodanddrink', 
                                'health', 'kids', 'lifestyle', 'music', 'news', 'sports', 'travel', 
                                'tv', 'video', 'weather'])
  
      // 查询表单
      const queryForm = reactive({
        timeRange: [...defaultTimeRange],
        categories: []
      })
  
      // 日期选择器限制（确保日期在合理范围内）
      const pickerOptions = {
        disabledDate(time) {
          const minDate = new Date('2019-06-13').getTime()
          const maxDate = new Date('2019-07-03').getTime()
          return time.getTime() < minDate || time.getTime() > maxDate
        }
      }
  
      // 图表配置
      const browseCountOption = computed(() => {
        const categories = [...new Set(chartData.value.map(item => item.category))]
        const dayStamps = [...new Set(chartData.value.map(item => item.day_stamp))].sort()
        return {
          tooltip: {
            trigger: 'axis',
            formatter: (params) => {
              let result = `${params[0].name}<br/>`
              params.forEach(p => {
                result += `${p.seriesName}: ${p.value} 次<br/>`
              })
              return result
            }
          },
          legend: {
            data: categories
          },
          xAxis: {
            type: 'category',
            data: dayStamps.map(stamp => formatDayStamp(stamp)),
            axisLabel: {
              rotate: 45,
              fontSize: 10
            }
          },
          yAxis: {
            type: 'value',
            name: '浏览次数'
          },
          series: categories.map(category => ({
            name: category,
            type: 'line',
            smooth: true,
            data: dayStamps.map(stamp => {
              const item = chartData.value.find(d => d.day_stamp === stamp && d.category === category)
              return item ? item.browse_count : 0
            }),
            itemStyle: {
              color: getCategoryColor(category)
            }
          }))
        }
      })
  
      const durationOption = computed(() => {
        const categories = [...new Set(chartData.value.map(item => item.category))]
        const dayStamps = [...new Set(chartData.value.map(item => item.day_stamp))].sort()
        return {
          tooltip: {
            trigger: 'axis',
            formatter: (params) => {
              let result = `${params[0].name}<br/>`
              params.forEach(p => {
                result += `${p.seriesName}: ${p.value} 秒<br/>`
              })
              return result
            }
          },
          legend: {
            data: categories
          },
          xAxis: {
            type: 'category',
            data: dayStamps.map(stamp => formatDayStamp(stamp)),
            axisLabel: {
              rotate: 45,
              fontSize: 10
            }
          },
          yAxis: {
            type: 'value',
            name: '时长(秒)',
            axisLabel: {
              formatter: (value) => {
                if (value >= 1000000) {
                  return `${(value / 1000000).toFixed(2)}M`
                } else if (value >= 1000) {
                  return `${(value / 1000).toFixed(2)}K`
                }
                return value.toLocaleString('zh-CN')
              }
            }
          },
          series: categories.map(category => ({
            name: category,
            type: 'line',
            smooth: true,
            data: dayStamps.map(stamp => {
              const item = chartData.value.find(d => d.day_stamp === stamp && d.category === category)
              return item ? item.browse_duration : 0
            }),
            itemStyle: {
              color: getCategoryColor(category)
            }
          }))
        }
      })
  
      // 辅助函数：格式化 day_stamp 为日期字符串
      const formatDayStamp = (dayStamp) => {
        const baseDate = new Date('1970-01-01')
        const date = new Date(baseDate.getTime() + dayStamp * 24 * 60 * 60 * 1000)
        return date.toISOString().split('T')[0] // 返回 YYYY-MM-DD
      }
  
      // 辅助函数：为分类分配颜色
      const getCategoryColor = (category) => {
        const colors = [
          '#409EFF', // 蓝色
          '#67C23A', // 绿色
          '#E6A23C', // 橙色
          '#F56C6C', // 红色
          '#909399', // 灰色
          '#00CED1', // 青色
          '#FF69B4', // 粉色
          '#FFD700', // 金色
          '#20B2AA', // 浅蓝绿色
          '#9932CC'  // 紫色
        ]
        // 使用哈希函数将类别映射到颜色数组索引
        const index = Math.abs(category.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)) % colors.length
      return colors[index]
}
  
      // 查询分类统计
      const queryStats = async () => {
        if (!queryForm.timeRange || queryForm.timeRange.length !== 2) {
          ElMessage.warning('请选择时间范围')
          return
        }
        if (!queryForm.categories || queryForm.categories.length === 0) {
          ElMessage.warning('请选择至少一个分类')
          return
        }
  
        loading.value = true
        hasQueried.value = true
  
        try {
          const startDay = Math.floor(queryForm.timeRange[0] / (24 * 3600))
          const endDay = Math.floor(queryForm.timeRange[1] / (24 * 3600))
          const categories = queryForm.categories.join(',')
  
          const response = await newsApi.getCategoryStats({
            start_day: startDay,
            end_day: endDay,
            categories
          })
  
          if (response.status === 'success') {
            // 将分组数据展平为表格和图表数据
            chartData.value = Object.entries(response.data).flatMap(([category, items]) =>
              items.map(item => ({
                day_stamp: item.day_stamp,
                category,
                browse_count: item.browse_count,
                browse_duration: Number(item.browse_duration) // 确保数值类型
              }))
            )
            if (chartData.value.length === 0) {
              ElMessage.info('该时间段内没有找到相关数据')
            }
          } else {
            ElMessage.error(response.message || '查询失败')
          }
        } catch (error) {
          console.error('查询错误:', error)
          ElMessage.error('查询失败，请稍后重试')
        } finally {
          loading.value = false
        }
      }
  
      // 重置表单
      const resetForm = () => {
        queryForm.timeRange = [...defaultTimeRange]
        queryForm.categories = []
        chartData.value = []
        hasQueried.value = false
      }
  
      return {
        loading,
        hasQueried,
        chartData,
        queryForm,
        defaultTimeRange,
        availableCategories,
        pickerOptions,
        browseCountOption,
        durationOption,
        queryStats,
        resetForm
      }
    }
  }
  </script>
  
  <style scoped>
  .category-stats {
    max-width: 1200px;
    margin: 0 auto;
  }
  
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 18px;
    font-weight: bold;
  }
  
  .query-form {
    margin-bottom: 20px;
    padding: 20px;
    background-color: #f5f7fa;
    border-radius: 4px;
  }
  
  .chart-container {
    margin-top: 20px;
  }
  
  .charts {
    margin-bottom: 30px;
  }
  
  .chart-wrapper {
    text-align: center;
  }
  
  .chart-wrapper h3 {
    margin-bottom: 15px;
    color: #303133;
  }
  
  .chart {
    height: 300px;
    width: 100%;
  }
  
  .data-table {
    margin-top: 30px;
  }
  
  .data-table h3 {
    margin-bottom: 15px;
    color: #303133;
  }
  </style>