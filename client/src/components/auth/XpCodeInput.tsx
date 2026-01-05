import { useState, useRef, useEffect, KeyboardEvent, ClipboardEvent } from "react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";

interface XpCodeInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function XpCodeInput({ value, onChange, disabled = false }: XpCodeInputProps) {
  const [digits, setDigits] = useState<string[]>(Array(11).fill(""));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const newDigits = value.toUpperCase().split("").slice(0, 11);
    while (newDigits.length < 11) newDigits.push("");
    setDigits(newDigits);
  }, [value]);

  const handleChange = (index: number, newValue: string) => {
    const char = newValue.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(-1);
    
    const newDigits = [...digits];
    newDigits[index] = char;
    setDigits(newDigits);
    onChange(newDigits.join(""));

    if (char && index < 10) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 10) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 11);
    const newDigits = pastedData.split("");
    while (newDigits.length < 11) newDigits.push("");
    setDigits(newDigits);
    onChange(newDigits.join(""));
    
    const focusIndex = Math.min(pastedData.length, 10);
    inputRefs.current[focusIndex]?.focus();
  };

  return (
    <div className="flex justify-center gap-1 sm:gap-2">
      {digits.map((digit, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.03 }}
        >
          <Input
            ref={(el) => (inputRefs.current[index] = el)}
            type="text"
            inputMode="text"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            disabled={disabled}
            className="w-7 h-10 sm:w-9 sm:h-12 text-center text-lg font-bold uppercase p-0 focus:ring-2 focus:ring-primary"
            data-testid={`input-xp-code-${index}`}
          />
        </motion.div>
      ))}
    </div>
  );
}
