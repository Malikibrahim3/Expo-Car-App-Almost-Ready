/**
 * NetPositionChart - Professional Financial Chart
 * Shows Net Sale Position over time (Sale Value - Remaining Finance = What You Walk Away With)
 * Robinhood/Stock App Style with smooth curves, gradient fills, and interactive scrubbing
 */

import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path, Circle, Line, Defs, LinearGradient, Stop, Text as SvgText } from 'react-native-svg';
import { TrendingUp, TrendingDown } from 'lucide-react-native';
import { haptic } from '@/src/constants/LinearDesign';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ChartDataPoint {
  month: number;
  equity: number;
  label: string;
  carValue?: number;
  loanOwed?: number;
}

interface ProfitChartProps {
  data: ChartDataPoint[];
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
  colors: any;
  currentMonthIndex: number;
  bestMonthIndex?: number;
  showValueBreakdown?: boolean;
}

export default function ProfitChart({
  data,
  selectedIndex,
  onSelectIndex,
  colors,
  currentMonthIndex,
  bestMonthIndex,
  showValueBreakdown = true,
}: ProfitChartProps) {
  const width = SCREEN_WIDTH - 32;
  const height = 260;
  const paddingTop = 16;
  const paddingBottom = 44;
  const paddingLeft = 12;
  const paddingRight = 12;
  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  // Calculate bounds with padding
  const values = data.map((d) => d.equity);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;
  const padding = range * 0.12;
  const adjustedMin = minVal - padding;
  const adjustedMax = maxVal + padding;
  const adjustedRange = adjustedMax - adjustedMin;

  // Coordinate helpers
  const getX = (index: number) => paddingLeft + (index / Math.max(1, data.length - 1)) * chartWidth;
  const getY = (val: number) => paddingTop + chartHeight - ((val - adjustedMin) / adjustedRange) * chartHeight;
  const zeroY = getY(0);

  // Build smooth bezier curve path
  const buildSmoothPath = useMemo(() => {
    if (data.length < 2) return '';
    let path = `M ${getX(0)} ${getY(data[0].equity)}`;
    for (let i = 1; i < data.length; i++) {
      const x0 = getX(i - 1);
      const y0 = getY(data[i - 1].equity);
      const x1 = getX(i);
      const y1 = getY(data[i].equity);
      const cpx = (x0 + x1) / 2;
      path += ` C ${cpx} ${y0}, ${cpx} ${y1}, ${x1} ${y1}`;
    }
    return path;
  }, [data, chartWidth, chartHeight]);

  // Build gradient fill path
  const fillPath = useMemo(() => {
    if (!buildSmoothPath) return '';
    const lastX = getX(data.length - 1);
    const firstX = getX(0);
    return `${buildSmoothPath} L ${lastX} ${height - paddingBottom} L ${firstX} ${height - paddingBottom} Z`;
  }, [buildSmoothPath, data.length]);

  // Selected point data
  const selectedData = data[selectedIndex] || data[0];
  const selectedX = getX(selectedIndex);
  const selectedY = getY(selectedData?.equity || 0);
  const isPositive = (selectedData?.equity || 0) >= 0;
  const currentEquity = data[currentMonthIndex]?.equity || 0;
  const lineColor = currentEquity >= 0 ? colors.positive : colors.negative;

  // Time period labels (show ~5 labels)
  const timeLabels = useMemo(() => {
    const labels: { index: number; label: string }[] = [];
    const step = Math.max(1, Math.floor(data.length / 5));
    for (let i = 0; i < data.length; i += step) {
      labels.push({ index: i, label: data[i].label });
    }
    // Always include last point
    if (labels.length > 0 && labels[labels.length - 1].index !== data.length - 1) {
      labels.push({ index: data.length - 1, label: data[data.length - 1].label });
    }
    return labels;
  }, [data]);

  // Touch handling
  const handleTouch = (x: number) => {
    const index = Math.round(((x - paddingLeft) / chartWidth) * (data.length - 1));
    const clampedIndex = Math.max(0, Math.min(data.length - 1, index));
    if (clampedIndex !== selectedIndex) {
      haptic.light();
      onSelectIndex(clampedIndex);
    }
  };

  // Format short label
  const formatShortLabel = (label: string) => {
    const parts = label.split(' ');
    if (parts.length > 1) {
      return `${parts[0].slice(0, 3)} '${parts[1].slice(2)}`;
    }
    return label;
  };

  return (
    <View style={styles.container}>
      {/* Value Display Header */}
      <View style={styles.valueHeader}>
        <View style={styles.valueLeft}>
          <Text style={[styles.valueLabel, { color: colors.textTertiary }]}>
            {selectedIndex === currentMonthIndex ? 'Net Sale Position (Today)' : `Net Position: ${selectedData?.label}`}
          </Text>
          <Text style={[styles.valueAmount, { color: isPositive ? colors.positive : colors.negative }]}>
            {isPositive ? '+' : '−'}${Math.round(Math.abs(selectedData?.equity || 0)).toLocaleString()}
          </Text>
        </View>
        <View style={styles.valueRight}>
          <View style={[styles.statusPill, { backgroundColor: isPositive ? colors.positiveBg : colors.negativeBg }]}>
            {isPositive ? <TrendingUp size={14} color={colors.positive} /> : <TrendingDown size={14} color={colors.negative} />}
            <Text style={[styles.statusText, { color: isPositive ? colors.positive : colors.negative }]}>
              {isPositive ? 'Positive' : 'Negative'}
            </Text>
          </View>
        </View>
      </View>

      {/* Value Breakdown - Net Sale Position */}
      {showValueBreakdown && selectedData?.carValue !== undefined && (
        <View style={[styles.breakdownRow, { borderColor: colors.border }]}>
          <View style={styles.breakdownItem}>
            <Text style={[styles.breakdownLabel, { color: colors.textTertiary }]}>Sale Value</Text>
            <Text style={[styles.breakdownValue, { color: colors.brand }]}>
              ${Math.round(selectedData.carValue || 0).toLocaleString()}
            </Text>
          </View>
          <View style={[styles.breakdownDivider, { backgroundColor: colors.border }]} />
          <View style={styles.breakdownItem}>
            <Text style={[styles.breakdownLabel, { color: colors.textTertiary }]}>Finance Owed</Text>
            <Text style={[styles.breakdownValue, { color: colors.text }]}>
              ${Math.round(selectedData.loanOwed || 0).toLocaleString()}
            </Text>
          </View>
          <View style={[styles.breakdownDivider, { backgroundColor: colors.border }]} />
          <View style={styles.breakdownItem}>
            <Text style={[styles.breakdownLabel, { color: colors.textTertiary }]}>You Walk Away</Text>
            <Text style={[styles.breakdownValue, { color: isPositive ? colors.positive : colors.negative }]}>
              {isPositive ? '+' : '−'}${Math.round(Math.abs(selectedData?.equity || 0)).toLocaleString()}
            </Text>
          </View>
        </View>
      )}

      {/* Chart */}
      <Pressable 
        onTouchMove={(e) => handleTouch(e.nativeEvent.locationX)} 
        onPress={(e) => handleTouch(e.nativeEvent.locationX)}
        style={styles.chartContainer}
      >
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={lineColor} stopOpacity="0.3" />
              <Stop offset="100%" stopColor={lineColor} stopOpacity="0.02" />
            </LinearGradient>
          </Defs>

          {/* Zero line (break-even) - where you walk away with $0 */}
          {minVal < 0 && maxVal > 0 && (
            <>
              <Line 
                x1={paddingLeft} 
                y1={zeroY} 
                x2={width - paddingRight} 
                y2={zeroY} 
                stroke="#FFB800" 
                strokeWidth={2} 
                strokeDasharray="6,4" 
              />
              <SvgText 
                x={width - paddingRight - 4} 
                y={zeroY - 8} 
                fontSize={10} 
                fill="#FFB800" 
                textAnchor="end"
                fontWeight="700"
              >
                Break-even ($0)
              </SvgText>
            </>
          )}

          {/* Gradient fill under line */}
          <Path d={fillPath} fill="url(#areaGradient)" />

          {/* Main line */}
          <Path 
            d={buildSmoothPath} 
            stroke={lineColor} 
            strokeWidth={3} 
            fill="none" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
          />

          {/* Today marker - GOLD */}
          {currentMonthIndex < data.length && (
            <>
              <Circle 
                cx={getX(currentMonthIndex)} 
                cy={getY(data[currentMonthIndex].equity)} 
                r={10} 
                fill="#FFB800" 
                opacity={0.3}
              />
              <Circle 
                cx={getX(currentMonthIndex)} 
                cy={getY(data[currentMonthIndex].equity)} 
                r={6} 
                fill="#FFB800" 
              />
              <SvgText 
                x={getX(currentMonthIndex)} 
                y={getY(data[currentMonthIndex].equity) - 14} 
                fontSize={9} 
                fill="#FFB800" 
                textAnchor="middle" 
                fontWeight="700"
              >
                NOW
              </SvgText>
            </>
          )}

          {/* Best month marker - GREEN (Optimal) */}
          {bestMonthIndex !== undefined && bestMonthIndex !== currentMonthIndex && bestMonthIndex < data.length && (
            <>
              <Circle 
                cx={getX(bestMonthIndex)} 
                cy={getY(data[bestMonthIndex].equity)} 
                r={12} 
                fill="#22C55E" 
                opacity={0.25} 
              />
              <Circle 
                cx={getX(bestMonthIndex)} 
                cy={getY(data[bestMonthIndex].equity)} 
                r={7} 
                fill="#22C55E" 
              />
              <SvgText 
                x={getX(bestMonthIndex)} 
                y={getY(data[bestMonthIndex].equity) - 16} 
                fontSize={9} 
                fill="#22C55E" 
                textAnchor="middle" 
                fontWeight="700"
              >
                OPTIMAL
              </SvgText>
            </>
          )}

          {/* Selection cursor line */}
          <Line 
            x1={selectedX} 
            y1={paddingTop} 
            x2={selectedX} 
            y2={height - paddingBottom} 
            stroke={colors.textQuaternary} 
            strokeWidth={1} 
            strokeDasharray="4,4" 
          />

          {/* Selection point */}
          <Circle cx={selectedX} cy={selectedY} r={14} fill={isPositive ? colors.positive : colors.negative} opacity={0.15} />
          <Circle cx={selectedX} cy={selectedY} r={8} fill={isPositive ? colors.positive : colors.negative} />
          <Circle cx={selectedX} cy={selectedY} r={3} fill="#fff" />

          {/* Y-axis labels */}
          <SvgText x={paddingLeft + 4} y={paddingTop + 14} fontSize={11} fill={colors.textTertiary} fontWeight="500">
            {maxVal >= 0 ? '+' : ''}${Math.round(maxVal / 1000)}k
          </SvgText>
          <SvgText x={paddingLeft + 4} y={height - paddingBottom - 6} fontSize={11} fill={colors.textTertiary} fontWeight="500">
            {minVal >= 0 ? '+' : ''}${Math.round(minVal / 1000)}k
          </SvgText>

          {/* X-axis time labels */}
          {timeLabels.map((item, i) => (
            <SvgText 
              key={i} 
              x={getX(item.index)} 
              y={height - paddingBottom + 20} 
              fontSize={11} 
              fill={colors.textTertiary} 
              textAnchor="middle"
            >
              {formatShortLabel(item.label)}
            </SvgText>
          ))}
        </Svg>
      </Pressable>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#FFB800' }]} />
          <Text style={[styles.legendText, { color: colors.textTertiary }]}>Now</Text>
        </View>
        {bestMonthIndex !== undefined && bestMonthIndex !== currentMonthIndex && (
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#22C55E' }]} />
            <Text style={[styles.legendText, { color: colors.textTertiary }]}>Optimal</Text>
          </View>
        )}
        {minVal < 0 && maxVal > 0 && (
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#FFB800', opacity: 0.6 }]} />
            <Text style={[styles.legendText, { color: colors.textTertiary }]}>Break-even</Text>
          </View>
        )}
      </View>
      
      {/* Break-even explanation */}
      {minVal < 0 && maxVal > 0 && (
        <Text style={[styles.breakEvenHint, { color: colors.textTertiary }]}>
          Break-even = no money lost or gained when selling
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  valueHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start', 
    marginBottom: 12, 
    paddingHorizontal: 4 
  },
  valueLeft: {},
  valueLabel: { fontSize: 13, marginBottom: 4, letterSpacing: -0.08 },
  valueAmount: { fontSize: 36, fontWeight: '700', letterSpacing: -1 },
  valueRight: { alignItems: 'flex-end', paddingTop: 4 },
  statusPill: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 5, 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 14 
  },
  statusText: { fontSize: 13, fontWeight: '600' },
  // Value breakdown row
  breakdownRow: {
    flexDirection: 'row',
    marginBottom: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  breakdownItem: {
    flex: 1,
    alignItems: 'center',
  },
  breakdownLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 4,
    letterSpacing: -0.08,
  },
  breakdownValue: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  breakdownDivider: {
    width: 1,
    marginVertical: 4,
  },
  chartContainer: { marginHorizontal: -4 },
  legend: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 20, 
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(128,128,128,0.2)',
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, fontWeight: '500' },
  legendHint: { fontSize: 11, fontStyle: 'italic' },
  breakEvenHint: { 
    fontSize: 11, 
    textAlign: 'center', 
    marginTop: 8,
    fontStyle: 'italic',
  },
});
