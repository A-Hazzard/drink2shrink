"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
    className,
    classNames,
    showOutsideDays = true,
    ...props
}: CalendarProps) {
    return (
        <DayPicker
            showOutsideDays={showOutsideDays}
            className={cn("p-2", className)}
            classNames={{
                months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                month: "space-y-4",
                caption: "flex justify-center pt-1 relative items-center",
                caption_label: "text-xs font-black uppercase tracking-widest text-gray-900",
                nav: "space-x-1 flex items-center",
                nav_button: cn(
                    buttonVariants({ variant: "outline" }),
                    "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
                ),
                nav_button_previous: "absolute left-1",
                nav_button_next: "absolute right-1",
                table: "w-full border-collapse space-y-1",
                head_row: "flex",
                head_cell:
                    "text-gray-400 rounded-md w-8 font-black text-[10px] uppercase tracking-widest",
                row: "flex w-full mt-2",
                cell: cn(
                    "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-accent [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected].day-range-end)]:rounded-r-md",
                    props.mode === "range"
                        ? "[&:has(>.day-range-end)]:rounded-r-md [&:has(>.day-range-start)]:rounded-l-md first:[&:has(>.day-range-start)]:rounded-l-md last:[&:has(>.day-range-end)]:rounded-r-md"
                        : "[&:has(>.day-selected)]:rounded-md"
                ),
                day: cn(
                    buttonVariants({ variant: "ghost" }),
                    "h-8 w-8 p-0 font-bold text-[11px] aria-selected:opacity-100"
                ),
                day_range_start: "day-range-start bg-green-700 text-white hover:bg-green-700 hover:text-white",
                day_range_end: "day-range-end bg-green-700 text-white hover:bg-green-700 hover:text-white",
                day_selected:
                    "bg-green-700 text-white hover:bg-green-700 hover:text-white focus:bg-green-700 focus:text-white",
                day_today: "bg-accent text-accent-foreground rounded-md",
                day_outside:
                    "day-outside text-gray-400 opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
                day_disabled: "text-muted-foreground opacity-50",
                day_range_middle:
                    "aria-selected:bg-green-50 aria-selected:text-green-900",
                day_hidden: "invisible",
                ...classNames,
            }}
            components={{
                IconLeft: () => <ChevronLeft className="h-4 w-4" />,
                IconRight: () => <ChevronRight className="h-4 w-4" />,
            }}
            {...props}
        />
    )
}
Calendar.displayName = "Calendar"

export { Calendar }
