import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";

interface WelcomeScreenProps {
  onComplete: () => void;
}

export function WelcomeScreen({ onComplete }: WelcomeScreenProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 4500); // Wait 4.5s before hiding for more complex animations

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#000000] overflow-hidden"
      exit={{ opacity: 0, scale: 1.1, filter: "blur(10px)", transition: { duration: 0.8, ease: "easeInOut" } }}
    >
      {/* Background Animated Gradient Orbs */}
      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full bg-[#1CA751]/30 blur-[60px]"
        animate={{ 
          x: [0, 100, -100, 0], 
          y: [0, -100, 100, 0],
          scale: [1, 1.2, 0.8, 1] 
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className="absolute w-[400px] h-[400px] rounded-full bg-blue-600/20 blur-[60px]"
        animate={{ 
          x: [0, -150, 150, 0], 
          y: [0, 150, -150, 0],
          scale: [1, 1.5, 0.7, 1] 
        }}
        transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
      />
      
      {/* Abstract particle overlay */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjMiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSIzIiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMDUiLz4KPC9zdmc+')] opacity-20" />

      <div className="relative flex flex-col items-center z-10">
        <motion.div
          initial={{ scale: 0, rotate: -180, opacity: 0, filter: "blur(10px)" }}
          animate={{ scale: 1, rotate: 0, opacity: 1, filter: "blur(0px)" }}
          transition={{
            type: "spring",
            stiffness: 260,
            damping: 20,
            duration: 1.5,
          }}
          className="mb-8 relative"
        >
          {/* Logo glow */}
          <motion.div 
            className="absolute inset-0 bg-[#1CA751]/40 blur-[20px] rounded-full"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1.5 }}
            transition={{ delay: 1, duration: 2, ease: "easeOut" }}
          />
          
          {/* Triyuga SVG Logo */}
          <svg xmlns='http://www.w3.org/2000/svg' viewBox='100 30 280 250' className="w-32 h-32 md:w-48 md:h-48 drop-shadow-2xl relative z-10">
            <g transform='translate(0, -10)'>
              <motion.polygon 
                points='262,85 232,100 262,115 292,100' 
                fill='#1CA751'
                initial={{ opacity: 0, y: -40, scale: 0 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 0.5, duration: 0.7, type: 'spring' }}
              />
              <motion.polygon 
                points='247,106 247,114 277,114 277,106' 
                fill='#E2F5E9'
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.7, duration: 0.5 }}
              />
              <motion.circle 
                cx='262' cy='132' r='16' 
                fill='#1CA751'
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.9, duration: 0.6, type: 'spring', stiffness: 300 }}
              />
              <motion.path 
                d='M 190,110 C 220,160 300,190 320,130 C 335,90 280,60 230,90 C 270,120 290,170 240,220 C 200,260 210,260 220,256 C 270,240 330,190 310,110 C 290,170 220,150 190,110 Z' 
                fill='#1CA751'
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 1.8, ease: "easeInOut" }}
              />
              <motion.polygon 
                points='175,182 153,193 175,204 197,193' 
                fill='#10b981'
                initial={{ opacity: 0, x: -40, rotate: -20 }}
                animate={{ opacity: 1, x: 0, rotate: 0 }}
                transition={{ delay: 0.8, duration: 0.6, type: 'spring' }}
              />
              <motion.polygon 
                points='164,198 164,204 186,204 186,198' 
                fill='#E2F5E9'
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.0, duration: 0.5 }}
              />
              <motion.circle 
                cx='175' cy='216' r='12' 
                fill='#1CA751'
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.2, duration: 0.6, type: 'spring', stiffness: 300 }}
              />
              <motion.path 
                d='M 225,175 C 200,210 150,220 145,180 C 140,150 175,130 210,150 C 180,170 160,210 195,245 C 220,270 238,272 230,268 C 185,250 145,220 165,170 C 180,210 210,200 225,175 Z' 
                fill='#10b981'
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 1.8, delay: 0.3, ease: "easeInOut" }}
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
            className="text-5xl md:text-7xl font-black tracking-widest uppercase mb-3 bg-clip-text text-transparent bg-gradient-to-b from-[#4eff8a] via-[#1CA751] to-[#0f7637] drop-shadow-[0_2px_10px_rgba(28,167,81,0.4)]"
            initial={{ y: 80, filter: "blur(10px)" }}
            animate={{ y: 0, filter: "blur(0px)" }}
            transition={{ type: "spring", stiffness: 100, damping: 20, delay: 1.2 }}
          >
            TRIYUGA
          </motion.h1>
        </motion.div>
        
        <div className="overflow-hidden">
          <motion.p
            className="text-sm md:text-base font-semibold tracking-[0.4em] uppercase text-zinc-400"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1.8, duration: 0.8, type: "spring", stiffness: 100 }}
          >
            Institute Management <span className="text-[#1CA751] drop-shadow-[0_0_8px_rgba(28,167,81,0.5)]">System</span>
          </motion.p>
        </div>
      </div>

      <motion.div
        className="absolute bottom-12 left-0 right-0 flex justify-center z-10"
        initial={{ opacity: 0, y: 30, filter: "blur(5px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ delay: 2.8, duration: 1, type: "spring", stiffness: 80 }}
      >
        <div className="flex flex-col items-center gap-1.5 backdrop-blur-md bg-[#000000]/45 px-6 py-3 rounded-2xl border border-zinc-700/50 shadow-2xl">
          <p className="text-zinc-400 text-[10px] tracking-widest uppercase mb-0 font-medium">Crafted With Excellence</p>
          <p className="text-zinc-200 text-xs tracking-widest uppercase flex items-center gap-2">
            Developed by <span className="bg-clip-text text-transparent bg-gradient-to-b from-emerald-300 to-[#1CA751] font-black tracking-[0.2em] text-sm drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]">AYUSH</span>
          </p>
        </div>
      </motion.div>
      
      {/* Loading progress bar indicator */}
      <motion.div 
        className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-transparent via-[#1CA751] to-transparent"
        initial={{ width: "0%", opacity: 0, left: "50%" }}
        animate={{ width: "100%", opacity: 1, left: "0%" }}
        transition={{ delay: 0.5, duration: 4, ease: "easeInOut" }}
      />
    </motion.div>
  );
}
