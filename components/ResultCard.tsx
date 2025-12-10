import React from 'react';
import { TryOnResult } from '../types';
import { Sparkles, AlertCircle, CheckCircle2, Ruler } from 'lucide-react';

interface ResultCardProps {
  result: TryOnResult;
}

const ResultCard: React.FC<ResultCardProps> = ({ result }) => {
  return (
    <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden flex flex-col h-full shadow-xl">
      {/* Image Section */}
      <div className="relative aspect-[3/4] w-full bg-zinc-950">
        {result.loading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-500 gap-4">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs animate-pulse">Designing your look...</p>
          </div>
        ) : result.error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-red-400 gap-2 p-4 text-center">
            <AlertCircle size={24} />
            <p className="text-sm">{result.error}</p>
          </div>
        ) : result.generatedImageUrl ? (
          <img
            src={result.generatedImageUrl}
            alt="Try-on Result"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-zinc-700">
            No Image
          </div>
        )}

        {/* Rating Badge */}
        {!result.loading && !result.error && result.stylistFeedback && (
          <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md text-white px-3 py-1 rounded-full border border-white/10 flex items-center gap-1.5 shadow-lg">
            <Sparkles size={14} className="text-yellow-400" />
            <span className="font-bold">{result.stylistFeedback.rating}/10</span>
          </div>
        )}
      </div>

      {/* Content Section */}
      {!result.loading && !result.error && result.stylistFeedback && (
        <div className="p-5 flex-1 flex flex-col gap-4">
          <div className="space-y-1">
            <h3 className="font-bold text-lg text-white leading-tight">
              "{result.stylistFeedback.verdict}"
            </h3>
            <p className="text-indigo-400 text-xs font-medium uppercase tracking-wider">
              {result.stylistFeedback.bestForEvent}
            </p>
          </div>

          <div className="space-y-3 pt-2 border-t border-zinc-800">
            <div className="flex items-start gap-2.5">
              <Ruler size={16} className="text-zinc-500 mt-0.5 shrink-0" />
              <div>
                <span className="text-xs text-zinc-500 block">Fit & Suitability</span>
                <p className="text-sm text-zinc-300 leading-snug">{result.stylistFeedback.suitability}</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <CheckCircle2 size={16} className="text-zinc-500 mt-0.5 shrink-0" />
              <div>
                <span className="text-xs text-zinc-500 block">Color Analysis</span>
                <p className="text-sm text-zinc-300 leading-snug">{result.stylistFeedback.colorAnalysis}</p>
              </div>
            </div>

            {result.stylistFeedback.improvements && (
              <div className="mt-2 pt-2 border-t border-zinc-800/50">
                <span className="text-xs text-indigo-400 font-semibold uppercase tracking-wider block mb-1">Styling Tips</span>
                <p className="text-sm text-zinc-400 leading-snug italic">
                  {result.stylistFeedback.improvements}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ResultCard;