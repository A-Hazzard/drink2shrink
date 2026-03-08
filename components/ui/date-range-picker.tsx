"use client"

import * as React from "react"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

interface DateRangePickerProps extends React.HTMLAttributes<HTMLDivElement> {
    date: DateRange | undefined
    setDate: (date: DateRange | undefined) => void
    placeholder?: string
}

export function DateRangePicker({
    date,
    setDate,
    placeholder = "Pick a date",
    className,
    ...props
}: DateRangePickerProps) {
    return (
        <div className={cn("grid gap-2", className)} {...props}>
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        id="date"
                        variant={"outline"}
                        className={cn(
                            "w-full sm:w-[260px] h-10 px-4 justify-start text-left font-black uppercase tracking-widest text-[10px] rounded-2xl bg-white border-gray-100 hover:bg-gray-50 transition-all shadow-sm",
                            !date && "text-gray-400"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date?.from ? (
                            date.to ? (
                                <>
                                    {format(date.from, "LLL dd")} -{" "}
                                    {format(date.to, "LLL dd")}
                                </>
                            ) : (
                                format(date.from, "LLL dd, y")
                            )
                        ) : (
                            <span>{placeholder}</span>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 rounded-3xl border-gray-100 shadow-2xl" align="start">
                    <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={date?.from}
                        selected={date}
                        onSelect={setDate}
                        numberOfMonths={1}
                        classNames={{
                            day_range_start: "bg-green-700 text-white rounded-l-2xl",
                            day_range_end: "bg-green-700 text-white rounded-r-2xl",
                            day_selected: "bg-green-700 text-white rounded-none",
                        }}
                    />
                </PopoverContent>
            </Popover>
        </div>
    )
}
