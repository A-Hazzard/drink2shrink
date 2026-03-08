"use client"

import * as React from "react"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerPropsProps {
    date: Date | undefined
    setDate: (date: Date | undefined) => void
    placeholder?: string
    className?: string
}

export function DatePicker({
    date,
    setDate,
    placeholder = "Pick a date",
    className,
}: DatePickerPropsProps) {
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant={"outline"}
                    className={cn(
                        "w-full h-12 px-5 justify-start text-left font-bold text-sm rounded-2xl bg-gray-50 border-transparent hover:bg-gray-100 transition-all text-gray-900",
                        !date && "text-gray-400",
                        className
                    )}
                >
                    <CalendarIcon className="mr-3 h-4 w-4 text-green-700" />
                    {date ? format(date, "PPP") : <span>{placeholder}</span>}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 rounded-3xl border-gray-100 shadow-2xl" align="start">
                <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                />
            </PopoverContent>
        </Popover>
    )
}
