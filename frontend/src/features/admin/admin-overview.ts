import { renderAdminMarkup } from './admin-react-renderer'
import { Chart, registerables } from 'chart.js'
import type { AdminDashboardCategoryDistribution, AdminDashboardOverview, AdminDashboardSummaryMetric } from '../../types/admin'
import { escapeHtml, formatNumber, toneClassName } from './admin-dashboard-support'

Chart.register(...registerables)
const CATEGORY_COLORS = ['#4F46E5', '#06B6D4', '#10B981', '#F59E0B']
let trafficChart: Chart | null = null
let categoryChart: Chart | null = null

function getElement<T extends HTMLElement>(id: string) {
  const element = document.getElementById(id)
  if (!element) throw new Error(`${id} element was not found`)
  return element as T
}

function updateMetric(prefix: string, metric: AdminDashboardSummaryMetric, fallbackSuffix = '') {
  getElement(prefix + '-value').textContent = formatNumber(metric.value)

  const suffixElement = document.getElementById(prefix + '-suffix')
  if (suffixElement) {
    suffixElement.textContent = metric.suffix || fallbackSuffix
  }

  const changeElement = getElement(prefix + '-change')
  changeElement.textContent = metric.changeLabel
  changeElement.className = `rounded px-1.5 py-0.5 text-xs font-bold ${toneClassName(metric.changeTone)}`
  getElement(prefix + '-progress').setAttribute('style', `width: ${metric.progressPercent}%`)
}

// 차트는 매번 새 데이터를 받을 때 기존 인스턴스를 정리하고 다시 만든다.
function renderTrafficChart(points: AdminDashboardOverview['trafficTrend']) {
  const canvas = document.getElementById('trafficChart') as HTMLCanvasElement | null
  const ctx = canvas?.getContext('2d')

  if (!ctx) {
    return
  }

  trafficChart?.destroy()

  const gradientBlue = ctx.createLinearGradient(0, 0, 0, 300)
  gradientBlue.addColorStop(0, 'rgba(79, 70, 229, 0.2)')
  gradientBlue.addColorStop(1, 'rgba(79, 70, 229, 0)')

  const gradientTeal = ctx.createLinearGradient(0, 0, 0, 300)
  gradientTeal.addColorStop(0, 'rgba(6, 182, 212, 0.2)')
  gradientTeal.addColorStop(1, 'rgba(6, 182, 212, 0)')

  trafficChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: points.map((point) => point.label),
      datasets: [
        {
          label: '학습자',
          data: points.map((point) => point.learners),
          borderColor: '#4F46E5',
          backgroundColor: gradientBlue,
          borderWidth: 2,
          tension: 0.4,
          fill: true,
        },
        {
          label: '강사',
          data: points.map((point) => point.instructors),
          borderColor: '#06B6D4',
          backgroundColor: gradientTeal,
          borderWidth: 2,
          tension: 0.4,
          fill: true,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          align: 'end',
        },
      },
    },
  })
}

function renderCategoryChart(categories: AdminDashboardCategoryDistribution[]) {
  const chartData = categories.length > 0 ? categories : [{ label: '기타', count: 1, percentage: 100 }]
  const canvas = document.getElementById('categoryChart') as HTMLCanvasElement | null
  const ctx = canvas?.getContext('2d')

  if (!ctx) {
    return
  }

  categoryChart?.destroy()
  categoryChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: chartData.map((category) => category.label),
      datasets: [
        {
          data: chartData.map((category) => category.count),
          backgroundColor: chartData.map((_, index) => CATEGORY_COLORS[index % CATEGORY_COLORS.length]),
          borderWidth: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '75%',
      plugins: { legend: { display: false } },
    },
  })

  renderAdminMarkup(getElement('categoryLegend'), chartData
    .map(
      (category, index) =>
        `<div class="flex items-center gap-1.5"><div class="h-2 w-2 rounded-full" style="background:${CATEGORY_COLORS[index % CATEGORY_COLORS.length]}"></div>${escapeHtml(category.label)} (${category.percentage}%)</div>`,
    )
    .join(''))
}

export function renderOverview(overview: AdminDashboardOverview) {
  updateMetric('weekly-active-users', overview.weeklyActiveUsers)
  updateMetric('pending-course-reviews', overview.pendingCourseReviews, '건')
  updateMetric('issued-certificates', overview.issuedCertificates)
  updateMetric('pending-reports', overview.pendingReports, '건')
  renderTrafficChart(overview.trafficTrend)
  renderCategoryChart(overview.courseCategoryDistribution)
  getElement('nav-report-badge').textContent = String(overview.pendingReports.value)
}
