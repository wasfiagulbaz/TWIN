import { useEffect, useState } from "react";
import StepRail from "../components/StepRail";
import MatchRing from "../components/MatchRing";
import UpgradeModal from "../components/UpgradeModal";
import { useAuth } from "../context/AuthContext";
import { addHistoryEntry } from "../context/history";
import { apiFetch } from "../lib/api";

const STEPS = [
  { key: "upload", label: "Upload Screenshots" },
  { key: "fingerprint", label: "Review Fingerprint" },
  { key: "preferences", label: "Sourcing Criteria" },
  { key: "results", label: "Results" },
];

const SkeletonRow = () => (
  <div className="w-full h-3 rounded-md animate-skeleton-shimmer"
    style={{
      background: "linear-gradient(90deg, #151a23 0%, #1a202b 40%, #151a23 80%)",
      backgroundSize: "800px 100%",
    }}
  />
);

export default function NewSearchPage() {
  const { user, canSearch, freeSearchLimit, refreshProfile } = useAuth();

  const [currentStep, setCurrentStep] = useState(0);

  const [images, setImages] = useState([]);
  const [product, setProduct] = useState(null);
  const [editingField, setEditingField] = useState(null);
  const [maxBuyPrice, setMaxBuyPrice] = useState("");
  const [marketplace, setMarketplace] = useState(user?.marketplace || "");
  const [searchResults, setSearchResults] = useState([]);
  const [showWeakMatches, setShowWeakMatches] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchStage, setSearchStage] = useState(0);
  const [error, setError] = useState("");
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const searchStages = [
    "Searching multiple retailers...",
    "Still searching — checking more sources...",
    "Comparing listings to your product...",
    "Almost done — finalizing matches...",
  ];

  useEffect(() => {
    if (!isSearching) {
      setSearchStage(0);
      return;
    }

    const interval = setInterval(() => {
      setSearchStage((previous) =>
        previous < searchStages.length - 1 ? previous + 1 : previous
      );
    }, 3500);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSearching]);

  const handleImageUpload = (event) => {
    const files = Array.from(event.target.files);

    const imageFiles = files.filter((file) =>
      file.type.startsWith("image/")
    );

    setImages((previous) => [...previous, ...imageFiles]);
    setError("");
  };

  const removeImage = (indexToRemove) => {
    setImages((previous) =>
      previous.filter((_, index) => index !== indexToRemove)
    );
  };

  const analyzeProduct = async () => {
    if (images.length === 0) return;

    setIsAnalyzing(true);
    setError("");
    setProduct(null);
    setSearchResults([]);

    try {
      const formData = new FormData();

      images.forEach((image) => {
        formData.append("images", image);
      });

      const { response, data } = await apiFetch("/product/analyze", {
        method: "POST",
        body: formData,
      });

      if (!response.ok || data.result?.status === "error") {
        throw new Error(
          data.result?.message || "Product analysis failed."
        );
      }

      setProduct(data.result.product);
      setCurrentStep(1);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const searchProduct = async () => {
    if (!product) return;

    if (!canSearch) {
      setShowUpgradeModal(true);
      return;
    }

    setIsSearching(true);
    setError("");
    setSearchResults([]);

    try {
      const { response, data } = await apiFetch("/product/search", {
        method: "POST",
        body: JSON.stringify({
          product,
          max_buy_price: maxBuyPrice ? Number(maxBuyPrice) : null,
          marketplace,
        }),
      });

      if (response.status === 403) {
        setShowUpgradeModal(true);
        return;
      }

      if (!response.ok || data.status !== "success") {
        const message =
          typeof data?.detail === "string"
            ? data.detail
            : data?.detail?.message || data?.message || "Product search failed.";
        throw new Error(message);
      }

      const results = data.results || [];
      setSearchResults(results);
      setCurrentStep(3);

      await refreshProfile();

      addHistoryEntry(user?.email, {
        productTitle: product.title || product.brand || "Untitled product",
        brand: product.brand || null,
        maxBuyPrice: maxBuyPrice ? Number(maxBuyPrice) : null,
        marketplace: marketplace || null,
        resultCount: results.length,
        topScore: results[0]?.match_score ?? null,
        topLevel: results[0]?.match_level ?? null,
        query: data.query || "",
      });
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setIsSearching(false);
    }
  };

  const copyResultUrl = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(url);

      setTimeout(() => {
        setCopiedUrl((current) => (current === url ? "" : current));
      }, 1500);
    } catch {
      // Clipboard permissions can fail in some browsers/contexts
    }
  };

  const strongOrPossibleResults = searchResults.filter(
    (result) => result.match_level !== "weak"
  );

  const weakResults = searchResults.filter(
    (result) => result.match_level === "weak"
  );

  const visibleResults = showWeakMatches
    ? searchResults
    : strongOrPossibleResults;

  const numericMaxBuyPrice =
    maxBuyPrice !== "" && !Number.isNaN(Number(maxBuyPrice))
      ? Number(maxBuyPrice)
      : null;

  const isOverBudget = (result) =>
    numericMaxBuyPrice !== null &&
    result.price !== null &&
    result.price !== undefined &&
    result.price > numericMaxBuyPrice;

  const goToStep = (index) => {
    if (index === 0) return setCurrentStep(0);
    if (index === 1 && product) return setCurrentStep(1);
    if (index === 2 && product) return setCurrentStep(2);
    if (index === 3 && searchResults.length > 0) return setCurrentStep(3);
  };

  const wizardCardBase =
    "bg-surface border border-border rounded-[18px] p-[34px] shadow-card animate-slide-up";

  return (
    <div className="new-search-page animate-fade-in">
      <StepRail steps={STEPS} currentStep={currentStep} onStepClick={goToStep} />

      {/* ============ STEP 0 — UPLOAD ============ */}
      {currentStep === 0 && (
        <div className={wizardCardBase}>
          <div className="flex justify-between items-start gap-5 flex-wrap mb-6">
            <div>
              <p className="m-0 mb-2.5 text-accent text-[11px] font-extrabold tracking-[2px] uppercase font-mono">
                Step 1 of 4
              </p>
              <h3 className="m-0 text-xl font-bold text-text font-display">
                Upload Product Screenshots
              </h3>
              <p className="m-2 mt-0 text-text-muted text-[13.5px] leading-relaxed">
                Provide screenshots of the product specifications for the
                most accurate analysis.
              </p>
            </div>
          </div>

          <div className="flex gap-3.5 my-6 p-4 pt-[18px] border border-accent-border bg-accent-soft rounded-xl">
            <div className="w-7 h-7 rounded-full bg-[rgba(47,217,138,0.18)] text-accent flex items-center justify-center flex-shrink-0 text-sm">
              ⓘ
            </div>
            <div>
              <strong className="text-[13.5px] text-text block">What should you upload?</strong>
              <p className="m-1.5 mt-0 text-text-muted text-[12.5px] leading-relaxed">
                Include screenshots showing the product title, brand,
                specifications, size, quantity, identifiers such as
                UPC/GTIN/ASIN, and other product details whenever available.
              </p>
              <p className="m-0 text-text-faint text-[12.5px] leading-relaxed">
                You can upload multiple screenshots. Don&apos;t worry if some
                information isn&apos;t visible — our AI will extract whatever it
                can find.
              </p>
            </div>
          </div>

          <label className="min-h-[220px] border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 bg-surface-2 hover:border-accent hover:bg-accent-soft group">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
              className="hidden"
            />
            <div className="w-12 h-12 rounded-lg bg-accent-soft text-accent flex items-center justify-center text-2xl mb-3.5 transition-transform duration-200 group-hover:scale-110">
              ↑
            </div>
            <h4 className="m-0 text-[15.5px] text-text font-semibold">Drop screenshots here</h4>
            <p className="m-1.5 my-[7px] text-text-muted text-[12.5px]">or click to browse from your computer</p>
            <span className="text-text-faint text-[11px] font-mono">
              PNG, JPG, JPEG • Multiple images supported
            </span>
          </label>

          {images.length > 0 && (
            <div className="mt-7 animate-fade-in">
              <div className="mb-3.5">
                <h4 className="m-0 text-sm font-semibold text-text">
                  Uploaded Screenshots
                  <span className="ml-2 px-2 py-0.5 rounded-full bg-accent-soft text-accent text-[11px] font-mono">
                    {images.length}
                  </span>
                </h4>
              </div>

              <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3.5">
                {images.map((image, index) => (
                  <div
                    className="relative overflow-hidden rounded-lg border border-border bg-surface-2 animate-fade-in group/img"
                    key={`${image.name}-${index}`}
                    style={{ animationDelay: `${Math.min(index * 40, 200)}ms` }}
                  >
                    <img
                      src={URL.createObjectURL(image)}
                      alt={`Product screenshot ${index + 1}`}
                      className="w-full h-[140px] object-cover block transition-transform duration-300 group-hover/img:scale-[1.03]"
                    />
                    <button
                      className="absolute top-2 right-2 w-6.5 h-6.5 border-none rounded-full bg-[rgba(10,13,16,0.85)] text-white text-lg opacity-90 hover:bg-red hover:scale-110 transition-all duration-150 flex items-center justify-center"
                      onClick={() => removeImage(index)}
                      type="button"
                    >
                      ×
                    </button>
                    <div className="px-2.5 py-2 text-[10.5px] text-text-muted bg-surface font-mono">
                      Screenshot {index + 1}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="mt-[18px] px-3.5 py-3 rounded-lg bg-red-soft border border-[rgba(239,90,90,0.35)] text-[#ff8f8f] text-sm animate-fade-in">
              {error}
            </div>
          )}

          <button
            className="w-full mt-6 h-[50px] border-none rounded-lg bg-accent text-[#04120b] font-extrabold text-sm flex items-center justify-between px-5 transition-all duration-200 ease-out hover:bg-accent-strong hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(47,217,138,0.3)] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none disabled:bg-accent"
            disabled={images.length === 0 || isAnalyzing}
            onClick={analyzeProduct}
            type="button"
          >
            <span className="flex items-center gap-2">
              {isAnalyzing ? (
                <svg className="animate-spin-slow w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
              ) : (
                <span>✦</span>
              )}
              {isAnalyzing ? "Analyzing Product..." : "Analyze Product"}
            </span>
            <span>→</span>
          </button>

          {isAnalyzing && (
            <div className="mt-5 p-5 rounded-xl border border-border bg-surface-2 animate-fade-in">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-2 h-2 rounded-full bg-accent animate-pulse-ring" />
                <p className="text-xs font-semibold text-accent font-mono tracking-wide">
                  EXTRACTING PRODUCT DATA FROM SCREENSHOTS
                </p>
              </div>
              <div className="space-y-3">
                <SkeletonRow />
                <SkeletonRow />
                <div className="w-3/4">
                  <SkeletonRow />
                </div>
                <SkeletonRow />
                <div className="w-2/3">
                  <SkeletonRow />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============ STEP 1 — FINGERPRINT ============ */}
      {currentStep === 1 && product && (
        <div className={wizardCardBase}>
          <div className="flex justify-between items-start gap-5 flex-wrap mb-6">
            <div>
              <p className="m-0 mb-2.5 text-accent text-[11px] font-extrabold tracking-[2px] uppercase font-mono">
                Step 2 of 4
              </p>
              <h3 className="m-0 text-xl font-bold text-text font-display">
                Extracted Product Information
              </h3>
              <p className="m-2 mt-0 text-text-muted text-[13.5px] leading-relaxed">
                Review the information extracted from your screenshots.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 gap-x-5 mt-6">
            {Object.entries(product)
              .filter(
                ([key]) => key !== "attributes" && key !== "field_confidence"
              )
              .map(([key, value]) => {
                const confidenceInfo = product.field_confidence?.find(
                  (item) => item.field === key
                );

                const confidence = confidenceInfo?.confidence ?? 1;

                let wrapperClass = "relative p-3.5 pt-4 border border-border rounded-lg bg-surface-2 transition-all duration-200 hover:border-[#3a4456]";
                if (confidence > 0 && confidence < 0.7) {
                  wrapperClass = "relative p-3.5 pt-4 border border-[rgba(240,168,59,0.5)] rounded-lg bg-amber-soft transition-all duration-200";
                } else if (confidence >= 0.7 && confidence < 0.9) {
                  wrapperClass = "relative p-3.5 pt-4 border border-[rgba(240,168,59,0.25)] rounded-lg bg-surface-2 transition-all duration-200";
                }

                return (
                  <div className={wrapperClass} key={key}>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[11px] text-text-faint capitalize font-mono">
                        {key.replaceAll("_", " ")}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setEditingField(editingField === key ? null : key)
                        }
                        className="border-none bg-none cursor-pointer text-[11px] font-bold text-accent opacity-75 hover:opacity-100 transition-opacity"
                      >
                        {editingField === key ? "Done" : "Edit"}
                      </button>
                    </div>

                    {editingField === key ? (
                      <input
                        value={value || ""}
                        placeholder="Not found"
                        onChange={(event) => {
                          setProduct((previous) => ({
                            ...previous,
                            [key]: event.target.value,
                          }));
                        }}
                        className="w-full mt-2 px-2.5 py-[9px] border border-border rounded-md text-[13.5px] bg-surface text-text outline-none transition-all duration-150 focus:border-accent focus:ring-2 focus:ring-accent/20"
                      />
                    ) : (
                      <strong className="block mt-1.5 text-sm text-text font-semibold break-words">
                        {value || "Not found"}
                      </strong>
                    )}
                  </div>
                );
              })}
          </div>

          {product.attributes?.length > 0 && (
            <div className="mt-7 animate-fade-in">
              <h4 className="m-0 mb-3.5 text-sm font-semibold text-text">
                Additional Attributes
              </h4>
              <div className="flex flex-col gap-2">
                {product.attributes.map((attribute, index) => (
                  <div
                    className="flex justify-between px-3.5 py-2.5 border border-border-soft rounded-lg bg-surface-2 text-[13px] transition-colors duration-150 hover:bg-surface-hover animate-fade-in"
                    key={`${attribute.name}-${index}`}
                    style={{ animationDelay: `${Math.min(index * 40, 200)}ms` }}
                  >
                    <span className="text-text-muted">{attribute.name}</span>
                    <strong className="text-text">{attribute.value}</strong>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 items-center mt-7">
            <button
              type="button"
              onClick={() => setCurrentStep(0)}
              className="h-[46px] border border-border bg-surface-2 text-text-muted rounded-lg px-5 text-[13px] font-bold mt-0 transition-all duration-200 hover:border-text-faint hover:text-text"
            >
              ← Back
            </button>
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="flex-1 h-[50px] border-none rounded-lg bg-accent text-[#04120b] font-extrabold text-sm flex items-center justify-between px-5 transition-all duration-200 ease-out hover:bg-accent-strong hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(47,217,138,0.3)] mt-0"
            >
              Continue to Sourcing Criteria
              <span>→</span>
            </button>
          </div>
        </div>
      )}

      {/* ============ STEP 2 — PREFERENCES ============ */}
      {currentStep === 2 && product && (
        <div className={wizardCardBase}>
          <div className="flex justify-between items-start gap-5 flex-wrap mb-6">
            <div>
              <p className="m-0 mb-2.5 text-accent text-[11px] font-extrabold tracking-[2px] uppercase font-mono">
                Step 3 of 4
              </p>
              <h3 className="m-0 text-xl font-bold text-text font-display">
                Set Your Sourcing Criteria
              </h3>
              <p className="m-2 mt-0 text-text-muted text-[13.5px] leading-relaxed">
                These preferences will be used when searching for sourcing
                opportunities.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-[18px]">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="max-buy-price" className="text-[12.5px] font-bold text-text">
                Maximum Buy Price
              </label>
              <div className="flex items-center h-[42px] border border-border rounded-lg bg-surface-2 overflow-hidden transition-colors duration-150 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20">
                <span className="pl-3 text-text-muted font-semibold font-mono">$</span>
                <input
                  id="max-buy-price"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="e.g. 15.00"
                  value={maxBuyPrice}
                  onChange={(event) => setMaxBuyPrice(event.target.value)}
                  className="h-full w-full border-none outline-none pl-1.5 pr-3 bg-transparent text-text text-sm placeholder:text-text-faint"
                />
              </div>
              <small className="text-text-faint text-[11px] leading-snug">
                Maximum amount you&apos;re willing to pay for the product.
              </small>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="marketplace" className="text-[12.5px] font-bold text-text">
                Marketplace / Location
              </label>
              <select
                id="marketplace"
                value={marketplace}
                onChange={(event) => setMarketplace(event.target.value)}
                className="h-[42px] px-3 border border-border rounded-lg bg-surface-2 text-text text-sm outline-none transition-all duration-150 focus:border-accent focus:ring-2 focus:ring-accent/20"
              >
                <option value="">Select marketplace</option>
                <option value="USA">USA</option>
                <option value="Canada">Canada</option>
                <option value="UK">United Kingdom</option>
                <option value="Australia">Australia</option>
              </select>
              <small className="text-text-faint text-[11px] leading-snug">
                Select the marketplace where you&apos;re sourcing.
              </small>
            </div>
          </div>

          {error && (
            <div className="mt-[18px] px-3.5 py-3 rounded-lg bg-red-soft border border-[rgba(239,90,90,0.35)] text-[#ff8f8f] text-sm animate-fade-in">
              {error}
            </div>
          )}

          <div className="flex gap-3 items-center mt-7">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="h-[46px] border border-border bg-surface-2 text-text-muted rounded-lg px-5 text-[13px] font-bold mt-0 transition-all duration-200 hover:border-text-faint hover:text-text"
            >
              ← Back
            </button>
            <button
              className="flex-1 h-[50px] border-none rounded-lg bg-accent text-[#04120b] font-extrabold text-sm flex items-center justify-between px-5 transition-all duration-200 ease-out hover:bg-accent-strong hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(47,217,138,0.3)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none mt-0"
              disabled={isSearching}
              onClick={searchProduct}
              type="button"
            >
              <span className="flex items-center gap-2">
                {isSearching && (
                  <svg className="animate-spin-slow w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                )}
                {isSearching ? searchStages[searchStage] : "Search For This Product"}
              </span>
              <span>→</span>
            </button>
          </div>

          {isSearching && (
            <div className="mt-5 animate-fade-in">
              <p className="text-text-faint text-[12.5px] text-center mb-4">
                Checking several retailers and comparing listings — this can
                take up to 15-20 seconds.
              </p>
              <div className="space-y-3">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="p-5 rounded-xl border border-border bg-surface-2 animate-fade-in"
                    style={{ animationDelay: `${i * 120}ms` }}
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-7 h-7 rounded-md bg-surface border border-border-soft flex items-center justify-center text-[11px] font-bold font-mono text-text-muted flex-shrink-0">
                        #{i + 1}
                      </div>
                      <div className="flex-1 space-y-2">
                        <SkeletonRow />
                        <div className="w-2/3">
                          <SkeletonRow />
                        </div>
                      </div>
                    </div>
                    <SkeletonRow />
                    <div className="w-1/2 mt-2">
                      <SkeletonRow />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!isSearching && (
            <p className="text-text-faint text-[12.5px] mt-2.5 text-center">
              Checking several retailers and comparing listings — this can
              take up to 15-20 seconds.
            </p>
          )}
        </div>
      )}

      {/* ============ STEP 3 — RESULTS ============ */}
      {currentStep === 3 && (
        <div className={wizardCardBase}>
          <div className="flex justify-between items-start gap-5 flex-wrap mb-6">
            <div>
              <p className="m-0 mb-2.5 text-accent text-[11px] font-extrabold tracking-[2px] uppercase font-mono">
                Step 4 of 4
              </p>
              <h3 className="m-0 text-xl font-bold text-text font-display">
                Products Found Online
              </h3>
              <p className="m-2 mt-0 text-text-muted text-[13.5px] leading-relaxed">
                Results are ranked according to how closely they match the
                extracted product fingerprint.
              </p>
            </div>

            {weakResults.length > 0 && (
              <button
                type="button"
                onClick={() => setShowWeakMatches((previous) => !previous)}
                className="text-[12.5px] px-3 py-1.5 rounded-lg border border-border bg-surface-2 text-text-muted cursor-pointer whitespace-nowrap self-start transition-all duration-200 hover:bg-surface-hover hover:text-text"
              >
                {showWeakMatches
                  ? `Hide weak matches (${weakResults.length})`
                  : `Show ${weakResults.length} weak match${
                      weakResults.length === 1 ? "" : "es"
                    }`}
              </button>
            )}
          </div>

          {visibleResults.length === 0 ? (
            <p className="text-text-faint text-[13.5px] py-4">
              No strong or possible matches found. Try showing weak matches
              above, or refine the product fingerprint.
            </p>
          ) : (
            <div className="flex flex-col gap-3 mt-[22px]">
              {visibleResults.map((result, index) => {
                const domain = (() => {
                  try {
                    return new URL(result.url).hostname.replace("www.", "");
                  } catch {
                    return result.url;
                  }
                })();

                const levelTextClass =
                  result.match_level === "strong"
                    ? "text-accent"
                    : result.match_level === "possible"
                    ? "text-amber"
                    : "text-red";

                return (
                  <div
                    key={`${result.url}-${index}`}
                    className="border border-border rounded-xl p-[18px] bg-surface-2 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-[#3a4456] hover:shadow-[0_12px_32px_rgba(0,0,0,0.25)] animate-fade-in"
                    style={{ animationDelay: `${Math.min(index * 50, 400)}ms` }}
                  >
                    <div className="flex justify-between items-start gap-5">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="min-w-7 h-7 flex items-center justify-center rounded-md bg-surface border border-border-soft text-[11px] font-bold font-mono text-text-muted flex-shrink-0">
                          #{index + 1}
                        </div>

                        <div className="min-w-0">
                          <h4 className="m-0 text-[14.5px] leading-snug text-text font-semibold">
                            {result.title}
                          </h4>

                          <div className="mt-1.5 text-xs text-text-faint">
                            {domain}
                          </div>

                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[11.5px] text-text-faint overflow-hidden text-ellipsis whitespace-nowrap max-w-[280px] select-all font-mono truncate">
                              {result.url}
                            </span>
                            <button
                              type="button"
                              onClick={() => copyResultUrl(result.url)}
                              className="text-[11px] px-2 py-0.5 rounded-md border border-border bg-surface text-text-muted cursor-pointer whitespace-nowrap transition-all duration-150 hover:bg-surface-hover hover:text-text"
                            >
                              {copiedUrl === result.url ? "Copied!" : "Copy"}
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <div className="flex items-center gap-2.5">
                          <MatchRing
                            score={result.match_score}
                            level={result.match_level}
                          />
                          <span className={`text-[10.5px] font-extrabold uppercase tracking-[0.4px] ${levelTextClass}`}>
                            {result.match_level === "strong"
                              ? "Strong"
                              : result.match_level === "possible"
                              ? "Possible"
                              : "Weak"}
                          </span>
                        </div>

                        {isOverBudget(result) && (
                          <div className="text-[10.5px] font-bold text-amber bg-amber-soft border border-[rgba(240,168,59,0.35)] rounded-full px-2.5 py-1 whitespace-nowrap">
                            Over Budget
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="my-3.5">
                      <p className="m-0 text-text-muted text-[13px] leading-relaxed">
                        {result.snippet}
                      </p>
                    </div>

                    <div className="flex justify-between items-center gap-[15px] pt-3.5 border-t border-border-soft flex-wrap">
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(result.checks || {}).map(
                          ([key, value]) => (
                            <span
                              key={key}
                              className={`px-2 py-1 rounded-md text-[10px] font-bold capitalize font-mono ${
                                value
                                  ? "bg-accent-soft text-accent"
                                  : "bg-red-soft text-[#ff8f8f]"
                              }`}
                            >
                              {value ? "✓" : "×"} {key.replaceAll("_", " ")}
                            </span>
                          )
                        )}
                        {result.price !== null && result.price !== undefined && (
                          <span className="px-2 py-1 rounded-md text-[10px] font-bold font-mono bg-accent-soft text-accent">
                            ✓ Price: ${result.price.toFixed(2)}
                          </span>
                        )}
                      </div>

                      <a
                        href={result.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="no-underline whitespace-nowrap text-xs font-bold text-text transition-colors duration-150 hover:text-accent"
                      >
                        Visit Website →
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex gap-3 items-center mt-7">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="h-[46px] border border-border bg-surface-2 text-text-muted rounded-lg px-5 text-[13px] font-bold mt-0 transition-all duration-200 hover:border-text-faint hover:text-text"
            >
              ← Back to Criteria
            </button>
            <button
              type="button"
              onClick={() => {
                setImages([]);
                setProduct(null);
                setSearchResults([]);
                setMaxBuyPrice("");
                setError("");
                setCurrentStep(0);
              }}
              className="flex-1 h-[50px] border-none rounded-lg bg-accent text-[#04120b] font-extrabold text-sm flex items-center justify-between px-5 transition-all duration-200 ease-out hover:bg-accent-strong hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(47,217,138,0.3)] mt-0"
            >
              Start a New Search
              <span>＋</span>
            </button>
          </div>
        </div>
      )}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        searchCount={user?.search_count ?? freeSearchLimit}
        limit={freeSearchLimit}
      />
    </div>
  );
}
