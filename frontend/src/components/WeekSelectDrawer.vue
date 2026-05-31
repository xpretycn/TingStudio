<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { getWeeksInMonth, getMonthsInYear, getCurrentMonth, getCurrentYear, getYearsRange, type WeekOption } from "../utils/isoWeekUtils";

interface Props {
  visible: boolean;
  type?: "weekly" | "monthly";
}

const props = withDefaults(defineProps<Props>(), {
  type: "weekly",
});

const emit = defineEmits<{
  (e: "update:visible", value: boolean): void;
  (e: "confirm", data: { periodStart: string; periodEnd: string; type: string }): void;
}>();

const currentYear = getCurrentYear();
const currentMonth = getCurrentMonth();

const selectedYear = ref(currentYear);
const selectedMonth = ref(currentMonth);
const selectedWeek = ref<number | null>(null);
const selectedWeekInfo = ref<WeekOption | null>(null);

const yearOptions = computed(() => getYearsRange(2024, currentYear + 1));
const monthOptions = computed(() => getMonthsInYear(selectedYear.value));
const weekOptions = computed<WeekOption[]>(() => {
  if (props.type !== "weekly") return [];
  return getWeeksInMonth(selectedYear.value, selectedMonth.value);
});

const periodPreview = computed(() => {
  if (props.type === "monthly") {
    const monthStr = String(selectedMonth.value).padStart(2, "0");
    return `${selectedYear.value}年${selectedMonth.value}月（${selectedYear.value}-${monthStr}-01 ~ ${selectedYear.value}-${monthStr}-${getLastDayOfMonth(selectedYear.value, selectedMonth.value)}）`;
  }
  if (selectedWeekInfo.value) {
    return `${selectedWeekInfo.value.periodStart} ~ ${selectedWeekInfo.value.periodEnd}`;
  }
  return "请选择周次";
});

function getLastDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

watch(selectedMonth, () => {
  selectedWeek.value = null;
  selectedWeekInfo.value = null;
});

watch(selectedWeek, (val) => {
  if (val !== null) {
    selectedWeekInfo.value = weekOptions.value.find((w) => w.value === val) || null;
  } else {
    selectedWeekInfo.value = null;
  }
});

function handleConfirm() {
  if (props.type === "weekly") {
    if (!selectedWeekInfo.value) {
      return;
    }
    emit("confirm", {
      periodStart: selectedWeekInfo.value.periodStart,
      periodEnd: selectedWeekInfo.value.periodEnd,
      type: props.type,
    });
  } else {
    const monthStr = String(selectedMonth.value).padStart(2, "0");
    const lastDay = getLastDayOfMonth(selectedYear.value, selectedMonth.value);
    emit("confirm", {
      periodStart: `${selectedYear.value}-${monthStr}-01`,
      periodEnd: `${selectedYear.value}-${monthStr}-${lastDay}`,
      type: props.type,
    });
  }
  handleClose();
}

function handleClose() {
  emit("update:visible", false);
}
</script>

<template>
  <t-drawer
    :visible="visible"
    :header="type === 'weekly' ? '生成周报' : '生成月报'"
    :footer="true"
    size="400px"
    @update:visible="(val: boolean) => emit('update:visible', val)"
  >
    <div class="week-select-content">
      <t-form label-align="top">
        <t-form-item label="选择年份">
          <t-select v-model="selectedYear" :options="yearOptions" value-key="value" />
        </t-form-item>

        <t-form-item label="选择月份">
          <t-select v-model="selectedMonth" :options="monthOptions" value-key="value" />
        </t-form-item>

        <t-form-item v-if="type === 'weekly'" label="选择周次">
          <t-select v-model="selectedWeek" placeholder="请选择周次">
            <t-option
              v-for="week in weekOptions"
              :key="week.value"
              :value="week.value"
              :label="week.label"
            />
          </t-select>
        </t-form-item>

        <div class="period-preview">
          <div class="preview-label">日期范围预览</div>
          <div class="preview-value">{{ periodPreview }}</div>
        </div>
      </t-form>
    </div>

    <template #footer>
      <div class="drawer-footer">
        <t-button variant="outline" @click="handleClose">取消</t-button>
        <t-button
          theme="primary"
          :disabled="type === 'weekly' && !selectedWeekInfo"
          @click="handleConfirm"
        >
          生成
        </t-button>
      </div>
    </template>
  </t-drawer>
</template>

<style scoped lang="scss">
.week-select-content {
  padding: 16px;
}

.period-preview {
  margin-top: 24px;
  padding: 16px;
  background: var(--color-bg-page);
  border-radius: 8px;

  .preview-label {
    font-size: 12px;
    color: var(--color-text-secondary);
    margin-bottom: 8px;
  }

  .preview-value {
    font-size: 14px;
    color: var(--color-text-primary);
    font-weight: 500;
  }
}

.drawer-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
