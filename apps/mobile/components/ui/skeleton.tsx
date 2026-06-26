import { useEffect } from "react"
import { FlatList } from "react-native"
import { Text } from "react-native"
import { View } from "react-native"
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated"

/**
 * Shimmer placeholder block. Pulses opacity on the UI thread (Reanimated),
 * so it's cheap to render many at once. Size + shape come from `className`
 * (e.g. `h-4 w-32 rounded-lg`); defaults to a small rounded bar.
 */
export function Skeleton({ className }: { className?: string }) {
  const opacity = useSharedValue(0.4)

  useEffect(() => {
    opacity.value = withRepeat(withTiming(0.9, { duration: 750 }), -1, true)
  }, [])

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }))

  return (
    <Animated.View
      style={style}
      className={`rounded-lg bg-elevated ${className ?? ""}`}
    />
  )
}

/** Mirrors the compact item card in the home rails (ItemHScroll): 148px-wide
 *  card with an 84px thumb, a two-line name, and an add button. */
export function ItemCardSkeleton() {
  return (
    <View className="w-[148px] h-[148px] rounded-2xl border border-border bg-card p-4 gap-2">
      <Skeleton className="rounded-xl py-12" />
      <Skeleton className="py-2 w-full" />
      <Skeleton className="rounded-xl p-4" />
    </View>
  )
}

/** A titled horizontal rail of `count` item-card skeletons (home rails). */
export function ItemRailSkeleton({ count = 4, title }: { count?: number; title?: string }) {
  return (
    <View className="mb-6 gap-3">
      {title && <Text className="mb-3 font-display text-xl font-bold text-foreground">{title}</Text>}
      <View className="flex-row gap-3">
        {Array.from({ length: count }).map((_, i) => (
          <ItemCardSkeleton key={i} />
        ))}
      </View>
    </View>
  )
}

/** Mirrors CategoryCard: bordered card with a centered 56px thumb + name. */
export function CategoryCardSkeleton() {
  return (
    <View className="items-stretch justify-stretch gap-2 rounded-2xl border border-border bg-card p-4" style={{ width: "48%" }}>
      <Skeleton className="py-12 rounded-xl" />
      <Skeleton className="py-2 px-6" />
    </View>
  )
}

/** A wrapped grid of `count` category-card skeletons (home categories). */
export function CategoryGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <View className="flex-row flex-wrap gap-4">
      <FlatList
        data={Array.from({ length: count })}
        numColumns={2}
        keyExtractor={(_, i) => `skele_cat_${i}`}
        columnWrapperClassName="gap-4"
        contentContainerClassName="gap-4"
        scrollEnabled={false}
        renderItem={() => (
          <CategoryCardSkeleton />
        )}
      />
    </View>
  )
}

/** Mirrors ItemRow: leading 52px thumb, two text lines, trailing add pill,
 *  with the same bottom divider used by the catalog/search lists. */
export function ItemRowSkeleton() {
  return (
    <View className="flex-row items-center gap-4 border-b border-border py-4">
      <Skeleton className="h-[52px] w-[52px] rounded-xl" />
      <View className="flex-1 gap-2">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-1/3" />
      </View>
      <Skeleton className="h-10 w-24 rounded-2xl" />
    </View>
  )
}

/** A list of `count` item-row skeletons (search results, category items). */
export function ItemRowListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <View>
      {Array.from({ length: count }).map((_, i) => (
        <ItemRowSkeleton key={i} />
      ))}
    </View>
  )
}

/** Matches the order row used on the orders list + driver home/history. */
export function OrderCardSkeleton() {
  return (
    <View className="mb-3 rounded-2xl border border-border bg-card p-4">
      <View className="flex-row items-center justify-between">
        <Skeleton className="w-32" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </View>
      <Skeleton className="mt-2.5 h-3 w-40" />
    </View>
  )
}

/** A list of `count` order-card skeletons. */
export function OrderListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <View>
      {Array.from({ length: count }).map((_, i) => (
        <OrderCardSkeleton key={i} />
      ))}
    </View>
  )
}

/** Mirrors the order detail screen: a 6-step timeline card (node + connector
 *  rail per step) followed by the line-items card with a totals divider. */
export function OrderDetailSkeleton() {
  return (
    <View className="gap-4 p-4">
      {/* timeline card */}
      <View className="rounded-2xl border border-border bg-card p-4">
        {Array.from({ length: 6 }).map((_, i) => {
          const last = i === 5
          return (
            <View key={i} className="flex-row gap-3">
              {/* node + connector rail */}
              <View className="items-center">
                <Skeleton className="size-5 rounded-full" />
                {!last ? <View className="my-1 w-0.5 flex-1 bg-border" /> : null}
              </View>
              <View className={`flex-1 ${last ? "" : "pb-4"}`}>
                <Skeleton className="h-4 w-32" />
              </View>
            </View>
          )
        })}
      </View>
      {/* line items card */}
      <View className="gap-3 rounded-2xl border border-border bg-card p-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <View key={i} className="flex-row items-center justify-between">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-16" />
          </View>
        ))}
        {/* totals divider */}
        <View className="mt-2 gap-2 border-t border-border pt-3">
          <View className="flex-row items-center justify-between">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-12" />
          </View>
          <View className="flex-row items-center justify-between">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-5 w-20" />
          </View>
        </View>
      </View>
    </View>
  )
}
