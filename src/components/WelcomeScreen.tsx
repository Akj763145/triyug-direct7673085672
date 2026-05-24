import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";

interface WelcomeScreenProps {
  onComplete: () => void;
}

export function WelcomeScreen({ onComplete }: WelcomeScreenProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 3500); // Wait 3.5s before hiding

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-zinc-950"
      exit={{ opacity: 0, transition: { duration: 0.8, ease: "easeInOut" } }}
    >
      <div className="relative flex flex-col items-center">
        <motion.div
          initial={{ scale: 0, rotate: -180, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{
            type: "spring",
            stiffness: 260,
            damping: 20,
            duration: 1.5,
          }}
          className="mb-8"
        >
          {/* Triyuga SVG Logo */}
          <svg xmlns='http://www.w3.org/2000/svg' viewBox='100 30 280 250' className="w-32 h-32 md:w-48 md:h-48 drop-shadow-2xl">
            <g transform='translate(0, -10)'>
              <motion.polygon 
                points='262,85 232,100 262,115 292,100' 
                fill='#1CA751'
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.5 }}
              />
              <motion.polygon 
                points='247,106 247,114 277,114 277,106' 
                fill='#1CA751'
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.7, duration: 0.5 }}
              />
              <motion.circle 
                cx='262' cy='132' r='16' 
                fill='#1CA751'
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.9, duration: 0.5, type: 'spring' }}
              />
              <motion.path 
                d='M 190,110 C 220,160 300,190 320,130 C 335,90 280,60 230,90 C 270,120 290,170 240,220 C 200,260 210,260 220,256 C 270,240 330,190 310,110 C 290,170 220,150 190,110 Z' 
                fill='#1CA751'
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 1.5, ease: "easeInOut" }}
              />
              <motion.polygon 
                points='175,182 153,193 175,204 197,193' 
                fill='#1CA751'
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8, duration: 0.5 }}
              />
              <motion.polygon 
                points='164,198 164,204 186,204 186,198' 
                fill='#1CA751'
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.0, duration: 0.5 }}
              />
              <motion.circle 
                cx='175' cy='216' r='12' 
                fill='#1CA751'
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.2, duration: 0.5, type: 'spring' }}
              />
              <motion.path 
                d='M 225,175 C 200,210 150,220 145,180 C 140,150 175,130 210,150 C 180,170 160,210 195,245 C 220,270 238,272 230,268 C 185,250 145,220 165,170 C 180,210 210,200 225,175 Z' 
                fill='#1CA751'
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 1.5, delay: 0.3, ease: "easeInOut" }}
              />
            </g>
          </svg>
        </motion.div>

        <motion.div
          className="overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.8 }}
        >
          <motion.h1 
            className="text-4xl md:text-6xl font-black text-white tracking-widest uppercase mb-2"
            initial={{ y: 50 }}
            animate={{ y: 0 }}
            transition={{ type: "spring", stiffness: 100, damping: 20, delay: 1.2 }}
          >
            TRIYUGA
          </motion.h1>
        </motion.div>
        
        <motion.p
          className="text-sm md:text-base text-[#1CA751] font-medium tracking-[0.3em] uppercase"
          initial={{ opacity: 0, filter: "blur(10px)" }}
          animate={{ opacity: 1, filter: "blur(0px)" }}
          transition={{ delay: 1.8, duration: 1 }}
        >
          Institute Management System
        </motion.p>
      </div>

      <motion.div
        className="absolute bottom-10 left-0 right-0 flex justify-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2.5, duration: 0.8 }}
      >
        <p className="text-zinc-500 text-xs tracking-widest uppercase flex items-center gap-2">
          Developed by <span className="text-white font-bold tracking-widest">AYUSH</span>
        </p>
      </motion.div>
    </motion.div>
  );
}
