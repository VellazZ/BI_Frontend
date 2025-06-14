<!-- components/UserInterests.vue -->
<template>
    <div class="user-interests">
      <el-card>
        <template #header>
          <div class="card-header">
            <span>用户兴趣分析</span>
          </div>
        </template>
        
        <!-- 查询表单 -->
        <el-form :model="queryForm" :inline="true" class="query-form">
          <el-form-item label="用户ID:">
            <el-input-number 
              v-model="queryForm.userId" 
              :min="1" 
              placeholder="请输入用户ID"
              style="width: 200px;"
            />
          </el-form-item>
          
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
          
          <el-form-item>
            <el-button 
              type="primary" 
              @click="queryUserInterests"
              :loading="loading"
            >
              查询
            </el-button>
            <el-button @click="resetForm">重置</el-button>
          </el-form-item>
        </el-form>
        
        <!-- 统计卡片 -->
        <div v-if="Object.keys(chartData).length > 0" class="stats-container">
          <el-row :gutter="20">
            <el-col :span="6">
              <el-statistic title="总浏览天数" :value="totalDays" />
            </el-col>
            <el-col :span="6">
              <el-statistic title="总浏览次数" :value="totalBrowseCount" />
            </el-col>
            <el-col :span="6">
              <el-statistic title="总浏览时长(秒)" :value="totalDuration" />
            </el-col>
            <el-col :span="6">
              <el-statistic title="兴趣分类数" :value="totalCategories" />
            </el-col>
          </el-row>
        </div>
        
        <!-- 图表展示 -->
        <div v-if="Object.keys(chartData).length > 0" class="chart-container">
          <el-row :gutter="20">
            <el-col :span="12">
              <div class="chart-wrapper">
                <h3>分类浏览次数分布</h3>
                <v-chart 
                  class="chart" 
                  :option="categoryCountOption" 
                  :loading="loading"
                />
              </div>
            </el-col>
            <el-col :span="12">
              <div class="chart-wrapper">
                <h3>分类浏览时长分布</h3>
                <v-chart 
                  class="chart" 
                  :option="categoryDurationOption" 
                  :loading="loading"
                />
              </div>
            </el-col>
          </el-row>
          
          <el-row style="margin-top: 20px;">
            <el-col :span="24">
              <div class="chart-wrapper">
                <h3>时间序列兴趣趋势</h3>
                <v-chart 
                  class="chart-large" 
                  :option="timeSeriesOption" 
                  :loading="loading"
                />
              </div>
            </el-col>
          </el-row>
          
          <el-row style="margin-top: 20px;">
            <el-col :span="24">
              <div class="chart-wrapper">
                <h3>每日兴趣热力图</h3>
                <v-chart 
                  class="chart-large" 
                  :option="heatmapOption" 
                  :loading="loading"
                />
              </div>
            </el-col>
          </el-row>
        </div>
        
        <!-- 详细数据表格 -->
        <div v-if="Object.keys(chartData).length > 0" class="data-table">
          <h3>详细数据</h3>
          <el-table :data="tableData" style="width: 100%" max-height="400">
            <el-table-column prop="date" label="日期" width="120" />
            <el-table-column prop="category" label="分类" width="120" />
            <el-table-column prop="browse_count" label="浏览次数" width="100" />
            <el-table-column prop="total_duration" label="总时长(秒)" width="120" />
            <el-table-column label="平均时长(秒)" width="120">
              <template #default="scope">
                {{ (scope.row.total_duration / scope.row.browse_count).toFixed(2) }}
              </template>
            </el-table-column>
          </el-table>
        </div>
        
        <!-- 空状态 -->
        <el-empty v-if="!loading && Object.keys(chartData).length === 0 && hasQueried" description="暂无数据" />
      </el-card>
    </div>
  </template>
  
  <script>
  import { ref, reactive, computed } from 'vue'
  import { use } from 'echarts/core'
  import { CanvasRenderer } from 'echarts/renderers'
  import { LineChart, BarChart, PieChart, HeatmapChart } from 'echarts/charts'
  import { ElMessage } from 'element-plus'
  import {
    TitleComponent,
    TooltipComponent,
    LegendComponent,
    GridComponent,
    DataZoomComponent,
    CalendarComponent,
    VisualMapComponent
  } from 'echarts/components'
  import VChart from 'vue-echarts'
  import { newsApi } from '../api/news'
  
  use([
    CanvasRenderer,
    LineChart,
    BarChart,
    PieChart,
    HeatmapChart,
    TitleComponent,
    TooltipComponent,
    LegendComponent,
    GridComponent,
    DataZoomComponent,
    CalendarComponent,
    VisualMapComponent
  ])
  
  export default {
    name: 'UserInterests',
    components: {
      VChart
    },
    setup() {
      const loading = ref(false)
      const hasQueried = ref(false)
      const chartData = ref({})
      
      // 默认时间范围 (2019-06-13 到 2019-07-03)
      const defaultTimeRange = [
        new Date('2019-06-13').getTime() / 1000,
        new Date('2019-07-03').getTime() / 1000
      ]
      
      const queryForm = reactive({
        userId: 1,
        timeRange: [...defaultTimeRange]
      })

      const pickerOptions = {
        disabledDate(time) {
          const minDate = new Date('2019-06-13').getTime()
          const maxDate = new Date('2019-07-03').getTime()
          return time.getTime() < minDate || time.getTime() > maxDate
        }
      }
      
      // 计算属性
      const totalDays = computed(() => {
        return Object.keys(chartData.value).length
      })
      
      const totalBrowseCount = computed(() => {
        let total = 0
        Object.values(chartData.value).forEach(dayData => {
          Object.values(dayData).forEach(categoryData => {
            total += categoryData.browse_count
          })
        })
        return total
      })
      
      const totalDuration = computed(() => {
        let total = 0
        Object.values(chartData.value).forEach(dayData => {
          Object.values(dayData).forEach(categoryData => {
            total += Number(categoryData.total_duration)
          })
        })
        return total
      })
      
      const totalCategories = computed(() => {
        const categories = new Set()
        Object.values(chartData.value).forEach(dayData => {
          Object.keys(dayData).forEach(category => {
            categories.add(category)
          })
        })
        return categories.size
      })
      
      // 处理表格数据
      const tableData = computed(() => {
        const data = []
        Object.entries(chartData.value).forEach(([timeStamp, dayData]) => {
          const date = timestampToDate(timeStamp)
          Object.entries(dayData).forEach(([category, categoryData]) => {
            data.push({
              date,
              category,
              browse_count: categoryData.browse_count,
              total_duration: Number(categoryData.total_duration)
            })
          })
        })
        return data.sort((a, b) => new Date(a.date) - new Date(b.date))
      })
      
      // 分类统计数据
      const categoryStats = computed(() => {
        const stats = {}
        Object.values(chartData.value).forEach(dayData => {
          Object.entries(dayData).forEach(([category, categoryData]) => {
            if (!stats[category]) {
              stats[category] = { count: 0, duration: 0 }
            }
            stats[category].count += categoryData.browse_count
            stats[category].duration += Number(categoryData.total_duration)
          })
        })
        return stats
      })
      
      // 分类浏览次数饼图
      const categoryCountOption = computed(() => ({
        tooltip: {
          trigger: 'item',
          formatter: '{a} <br/>{b}: {c} ({d}%)'
        },
        legend: {
          orient: 'vertical',
          left: 'left'
        },
        series: [{
          name: '分类浏览次数',
          type: 'pie',
          radius: '70%',
          data: Object.entries(categoryStats.value).map(([category, data]) => ({
            value: data.count,
            name: category
          }))
        }]
      }))
      
      // 分类浏览时长饼图
      const categoryDurationOption = computed(() => ({
        tooltip: {
          trigger: 'item',
          formatter: '{a} <br/>{b}: {c}秒 ({d}%)'
        },
        legend: {
          orient: 'vertical',
          left: 'left'
        },
        series: [{
          name: '分类浏览时长',
          type: 'pie',
          radius: '70%',
          data: Object.entries(categoryStats.value).map(([category, data]) => ({
            value: data.duration,
            name: category
          }))
        }]
      }))
      
      // 时间序列趋势图
      const timeSeriesOption = computed(() => {
        const categories = Object.keys(categoryStats.value)
        const dates = Object.keys(chartData.value).sort().map(ts => timestampToDate(ts))
        
        const series = categories.map(category => ({
          name: category,
          type: 'line',
          data: dates.map(date => {
            const timeStamp = dateToTimestamp(date)
            const dayData = chartData.value[timeStamp]
            return dayData && dayData[category] ? dayData[category].browse_count : 0
          }),
          smooth: true
        }))
        
        return {
          tooltip: {
            trigger: 'axis'
          },
          legend: {
            data: categories,
            type: 'scroll'
          },
          xAxis: {
            type: 'category',
            data: dates,
            axisLabel: {
              rotate: 45
            }
          },
          yAxis: {
            type: 'value',
            name: '浏览次数'
          },
          series,
          dataZoom: [{
            type: 'slider',
            start: 0,
            end: 100
          }]
        }
      })
      
      // 热力图
      const heatmapOption = computed(() => {
        const categories = Object.keys(categoryStats.value)
        const dates = Object.keys(chartData.value).sort().map(ts => timestampToDate(ts))
        
        const data = []
        dates.forEach((date, dateIndex) => {
          const timeStamp = dateToTimestamp(date)
          const dayData = chartData.value[timeStamp]
          categories.forEach((category, categoryIndex) => {
            const value = dayData && dayData[category] ? dayData[category].browse_count : 0
            data.push([dateIndex, categoryIndex, value])
          })
        })
        
        return {
          tooltip: {
            position: 'top',
            formatter: function (params) {
              return `${dates[params.data[0]]}<br/>${categories[params.data[1]]}: ${params.data[2]}次`
            }
          },
          grid: {
            height: '50%',
            top: '10%'
          },
          xAxis: {
            type: 'category',
            data: dates,
            splitArea: {
              show: true
            },
            axisLabel: {
              rotate: 45
            }
          },
          yAxis: {
            type: 'category',
            data: categories,
            splitArea: {
              show: true
            }
          },
          visualMap: {
            min: 0,
            max: Math.max(...data.map(item => item[2])),
            calculable: true,
            orient: 'horizontal',
            left: 'center',
            bottom: '15%'
          },
          series: [{
            name: '浏览次数',
            type: 'heatmap',
            data: data,
            label: {
              show: true
            },
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowColor: 'rgba(0, 0, 0, 0.5)'
              }
            }
          }]
        }
      })
      
      // 工具函数
      const timestampToDate = (timestamp) => {
        const baseDate = new Date('1970-01-01')
        const date = new Date(baseDate.getTime() + Number(timestamp) * 24 * 60 * 60 * 1000)
        return date.toISOString().split('T')[0]
      }
      
      const dateToTimestamp = (dateStr) => {
        const date = new Date(dateStr)
        const baseDate = new Date('1970-01-01')
        const diffTime = date.getTime() - baseDate.getTime()
        return Math.floor(diffTime / (1000 * 60 * 60 * 24))
      }
      
      // 查询用户兴趣
      const queryUserInterests = async () => {
        if (!queryForm.userId) {
          ElMessage.warning('请输入用户ID')
          return
        }
        
        loading.value = true
        hasQueried.value = true
        
        try {
          const startDay = Math.floor(queryForm.timeRange[0] / 86400) // 转换为daystamp
          const endDay = Math.floor(queryForm.timeRange[1] / 86400)
          
          const response = await newsApi.getUserInterests({
            user_id: queryForm.userId,
            start_day: startDay,
            end_day: endDay
          })
          
          if (response.status === 'success') {
            chartData.value = response.data
            if (Object.keys(chartData.value).length === 0) {
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
        queryForm.userId = 1
        queryForm.timeRange = [...defaultTimeRange]
        chartData.value = {}
        hasQueried.value = false
      }
      
      return {
        loading,
        hasQueried,
        chartData,
        queryForm,
        pickerOptions,
        defaultTimeRange,
        totalDays,
        totalBrowseCount,
        totalDuration,
        totalCategories,
        tableData,
        categoryCountOption,
        categoryDurationOption,
        timeSeriesOption,
        heatmapOption,
        queryUserInterests,
        resetForm
      }
    }
  }
  </script>
  
  <style scoped>
  .user-interests {
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
  
  .stats-container {
    margin: 20px 0;
    padding: 20px;
    background-color: #fafafa;
    border-radius: 4px;
  }
  
  .chart-container {
    margin-top: 20px;
  }
  
  .chart-wrapper {
    text-align: center;
    margin-bottom: 20px;
  }
  
  .chart-wrapper h3 {
    margin-bottom: 15px;
    color: #303133;
  }
  
  .chart {
    height: 350px;
    width: 100%;
  }
  
  .chart-large {
    height: 400px;
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