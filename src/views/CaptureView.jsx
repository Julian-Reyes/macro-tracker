import MacroRing from "../components/MacroRing";
import ItemRow from "../components/ItemRow";
import MealTypePicker from "../components/MealTypePicker";
import QuickAddSection from "../components/QuickAddSection";
import { useLocale } from "../locales/index.jsx";

export default function CaptureView({
  view,
  image,
  analysis,
  loading,
  error,
  adjustedItems,
  adjustedTotals,
  itemAdjustments,
  extraItems,
  extraItemAdjustments,
  expandedItemIndex,
  expandedExtraIndex,
  addingExtraItem,
  mealDetailMode,
  selectedMealType,
  manualQuery,
  manualResults,
  manualSearching,
  selectedFood,
  manualGrams,
  scaledFoodMacros,
  goals,
  fileInputRef,
  cameraInputRef,
  handleFile,
  analyzeFood,
  addToDaily,
  updateItemMultiplier,
  updateExtraItemMultiplier,
  removeAnalysisItem,
  removeExtraItem,
  setExpandedItemIndex,
  setExpandedExtraIndex,
  setAddingExtraItem,
  setSelectedMealType,
  handleManualSearch,
  selectFood,
  setSelectedFood,
  setManualGrams,
  setManualQuery,
  setManualResults,
  addExtraItemToScan,
  setView,
  resetCapture,
  setError,
  setMealDetailMode,
  setAnalysis,
  setImage,
  mealDescription,
  setMealDescription,
  onBarcodeScan,
  isEditing,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  recentMeals,
  favoriteMeals,
  onRelogMeal,
  onToggleFavorite,
}) {
  const { t } = useLocale();

  return (
    <div style={{ animation: "fadeSlideIn 0.3s ease-out" }}>
      {view === "capture" && !image ? (
        <div
          style={{
            padding: "40px 20px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "24px",
          }}
        >
          <div
            style={{
              width: "100%",
              aspectRatio: "4/3",
              borderRadius: "16px",
              border: "2px dashed rgba(255,255,255,0.08)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "16px",
              background: "rgba(255,255,255,0.015)",
            }}
          >
            <div style={{ fontSize: "48px", opacity: 0.2 }}>📸</div>
            <p
              style={{
                color: "rgba(255,255,255,0.3)",
                fontSize: "14px",
                textAlign: "center",
                lineHeight: 1.5,
              }}
            >
              {t("capture.snapPhoto")}
              <br />
              <span style={{ fontSize: "12px", opacity: 0.6 }}>
                {t("capture.aiEstimate")}
              </span>
            </p>
          </div>

          <div style={{ display: "flex", gap: "12px", width: "100%" }}>
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                flex: 1,
                padding: "14px",
                borderRadius: "12px",
                cursor: "pointer",
                border: "1px solid rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.03)",
                color: "#fff",
                fontSize: "14px",
                fontWeight: 500,
                fontFamily: "'DM Sans',sans-serif",
              }}
            >
              🖼️ {t("capture.gallery")}
            </button>
            <button
              onClick={() => cameraInputRef.current?.click()}
              style={{
                flex: 1,
                padding: "14px",
                borderRadius: "12px",
                border: "none",
                cursor: "pointer",
                background: "linear-gradient(135deg, #E8C872, #D4A843)",
                color: "#0C0C0E",
                fontSize: "14px",
                fontWeight: 700,
                fontFamily: "'DM Sans',sans-serif",
                letterSpacing: "0.3px",
              }}
            >
              📷 {t("capture.camera")}
            </button>
            <button
              onClick={onBarcodeScan}
              style={{
                flex: 1,
                padding: "14px",
                borderRadius: "12px",
                cursor: "pointer",
                border: "1px solid rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.03)",
                color: "#fff",
                fontSize: "14px",
                fontWeight: 500,
                fontFamily: "'DM Sans',sans-serif",
              }}
            >
              {t("capture.barcode")}
            </button>
          </div>

          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => handleFile(e.target.files?.[0])}
            style={{ display: "none" }}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => handleFile(e.target.files?.[0])}
            style={{ display: "none" }}
          />

          <QuickAddSection
            favoriteMeals={favoriteMeals || []}
            recentMeals={recentMeals || []}
            onRelogMeal={onRelogMeal}
            onToggleFavorite={onToggleFavorite}
            t={t}
          />

          <button
            onClick={() => setView("manual")}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "rgba(255,255,255,0.45)",
              fontSize: "13px",
              fontFamily: "'DM Sans',sans-serif",
              padding: "12px 24px",
              minHeight: "44px",
            }}
          >
            {t("capture.orTypeIt")}
          </button>
        </div>
      ) : (
        <div>
          {/* Image preview (only if image exists) */}
          {image && (
            <div style={{ position: "relative" }}>
              <img
                src={image}
                alt="Food"
                style={{
                  width: "100%",
                  maxHeight: "280px",
                  objectFit: "cover",
                  display: "block",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: "80px",
                  background: "linear-gradient(transparent, #0C0C0E)",
                }}
              />
              {!analysis && !loading && (
                <button
                  onClick={resetCapture}
                  style={{
                    position: "absolute",
                    top: "12px",
                    right: "12px",
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    background: "rgba(0,0,0,0.5)",
                    backdropFilter: "blur(8px)",
                    border: "none",
                    color: "#fff",
                    cursor: "pointer",
                    fontSize: "16px",
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          )}

          {/* Meal description (optional) */}
          {!analysis && !loading && (
            <div style={{ padding: "12px 20px 0" }}>
              <input
                type="text"
                value={mealDescription}
                onChange={(e) => setMealDescription(e.target.value)}
                placeholder={t("capture.describeMeal")}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  borderRadius: "12px",
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(255,255,255,0.04)",
                  color: "#fff",
                  fontSize: "13px",
                  fontFamily: "'DM Sans',sans-serif",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              <p
                style={{
                  fontSize: "11px",
                  color: "rgba(255,255,255,0.2)",
                  margin: "6px 0 0",
                }}
              >
                e.g. "turkey sandwich with swiss cheese, lettuce, mayo on sourdough"
              </p>
            </div>
          )}

          {/* Action / Loading */}
          {!analysis && !loading && (
            <div style={{ padding: "20px", display: "flex", gap: "12px" }}>
              <button
                onClick={resetCapture}
                style={{
                  padding: "14px 20px",
                  borderRadius: "12px",
                  cursor: "pointer",
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "transparent",
                  color: "#fff",
                  fontSize: "14px",
                  fontFamily: "'DM Sans',sans-serif",
                }}
              >
                {t("capture.retake")}
              </button>
              <button
                onClick={analyzeFood}
                style={{
                  flex: 1,
                  padding: "14px",
                  borderRadius: "12px",
                  border: "none",
                  cursor: "pointer",
                  background: "linear-gradient(135deg, #E8C872, #D4A843)",
                  color: "#0C0C0E",
                  fontSize: "14px",
                  fontWeight: 700,
                  fontFamily: "'DM Sans',sans-serif",
                }}
              >
                {t("capture.analyze")} →
              </button>
            </div>
          )}

          {loading && (
            <div style={{ padding: "32px 20px", textAlign: "center" }}>
              <div
                style={{
                  height: "3px",
                  borderRadius: "2px",
                  margin: "0 auto 16px",
                  width: "200px",
                  background:
                    "linear-gradient(90deg, transparent, #E8C872, transparent)",
                  backgroundSize: "200% 100%",
                  animation: "shimmer 1.5s infinite",
                }}
              />
              <p
                style={{
                  color: "rgba(255,255,255,0.4)",
                  fontSize: "13px",
                  animation: "pulse 2s infinite",
                }}
              >
                {t("capture.analyzing")}
              </p>
            </div>
          )}

          {error && (
            <div style={{ padding: "20px", textAlign: "center" }}>
              <p
                style={{
                  color: "#E87272",
                  fontSize: "13px",
                  marginBottom: "12px",
                }}
              >
                {error}
              </p>
              <button
                onClick={() => {
                  setError(null);
                }}
                style={{
                  padding: "10px 24px",
                  borderRadius: "10px",
                  border: "1px solid rgba(232,114,114,0.3)",
                  background: "transparent",
                  color: "#E87272",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontFamily: "'DM Sans',sans-serif",
                }}
              >
                {t("capture.tryAgain")}
              </button>
            </div>
          )}

          {/* Results */}
          {analysis && adjustedTotals && (
            <div style={{ animation: "fadeSlideIn 0.4s ease-out" }}>
              {/* Macro Rings */}
              <div
                style={{
                  padding: "20px",
                  display: "flex",
                  justifyContent: "space-around",
                  background: "rgba(255,255,255,0.015)",
                  borderBottom: "1px solid rgba(255,255,255,0.04)",
                }}
              >
                <MacroRing
                  value={adjustedTotals.calories}
                  max={goals.calories}
                  color="#E8C872"
                  label="Calories"
                  unit="kcal"
                />
                <MacroRing
                  value={adjustedTotals.protein_g}
                  max={goals.proteinG}
                  color="#7BE0AD"
                  label="Protein"
                  unit="g"
                />
                <MacroRing
                  value={adjustedTotals.carbs_g}
                  max={goals.carbsG}
                  color="#72B4E8"
                  label="Carbs"
                  unit="g"
                />
                <MacroRing
                  value={adjustedTotals.fat_g}
                  max={goals.fatG}
                  color="#E87272"
                  label="Fat"
                  unit="g"
                />
              </div>

              {/* Extra stats */}
              <div
                style={{
                  display: "flex",
                  padding: "12px 20px",
                  gap: "16px",
                  borderBottom: "1px solid rgba(255,255,255,0.04)",
                }}
              >
                {adjustedTotals.fiber_g !== undefined && (
                  <span
                    style={{
                      fontSize: "12px",
                      color: "rgba(255,255,255,0.35)",
                    }}
                  >
                    {t("capture.fiber")}{" "}
                    <span style={{ color: "rgba(255,255,255,0.6)" }}>
                      {adjustedTotals.fiber_g}g
                    </span>
                  </span>
                )}
                {adjustedTotals.sugar_g !== undefined && (
                  <span
                    style={{
                      fontSize: "12px",
                      color: "rgba(255,255,255,0.35)",
                    }}
                  >
                    {t("capture.sugar")}{" "}
                    <span style={{ color: "rgba(255,255,255,0.6)" }}>
                      {adjustedTotals.sugar_g}g
                    </span>
                  </span>
                )}
              </div>

              {/* Item Breakdown */}
              <div>
                <div
                  style={{
                    padding: "16px 20px 8px",
                    display: "flex",
                    alignItems: "baseline",
                    gap: "8px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "11px",
                      color: "rgba(255,255,255,0.25)",
                      textTransform: "uppercase",
                      letterSpacing: "1px",
                      fontWeight: 500,
                    }}
                  >
                    {t("capture.breakdown")}
                  </span>
                  {(!mealDetailMode || isEditing) && (
                    <span
                      style={{
                        fontSize: "10px",
                        color: "rgba(255,255,255,0.15)",
                      }}
                    >
                      {t("capture.tapAdjust")}
                    </span>
                  )}
                </div>
                {analysis.items.map((_, i) => {
                  const item = adjustedItems
                    ? adjustedItems[i]
                    : analysis.items[i];
                  return (
                    <ItemRow
                      key={i}
                      item={item}
                      index={i}
                      editable={!mealDetailMode || isEditing}
                      expanded={expandedItemIndex === i}
                      multiplier={itemAdjustments[i]?.multiplier ?? 1.0}
                      onToggle={() =>
                        setExpandedItemIndex(
                          expandedItemIndex === i ? null : i,
                        )
                      }
                      onMultiplierChange={(val) =>
                        updateItemMultiplier(i, val)
                      }
                      onRemove={() => removeAnalysisItem(i)}
                    />
                  );
                })}
                {extraItems.map((item, i) => {
                  const extraAdj = adjustedItems
                    ? adjustedItems[analysis.items.length + i]
                    : item;
                  return (
                    <ItemRow
                      key={`extra-${i}`}
                      item={extraAdj}
                      index={analysis.items.length + i}
                      editable={!mealDetailMode || isEditing}
                      expanded={expandedExtraIndex === i}
                      multiplier={
                        extraItemAdjustments[i]?.multiplier ?? 1.0
                      }
                      onToggle={() =>
                        setExpandedExtraIndex(
                          expandedExtraIndex === i ? null : i,
                        )
                      }
                      onMultiplierChange={(val) =>
                        updateExtraItemMultiplier(i, val)
                      }
                      onRemove={() => removeExtraItem(i)}
                    />
                  );
                })}
                {(!mealDetailMode || isEditing) && (
                  <div style={{ padding: "12px 20px" }}>
                    {!addingExtraItem ? (
                      <button
                        onClick={() => {
                          setAddingExtraItem(true);
                          setManualQuery("");
                          setManualResults([]);
                          setSelectedFood(null);
                        }}
                        style={{
                          width: "100%",
                          padding: "10px",
                          borderRadius: "10px",
                          border: "1px dashed rgba(255,255,255,0.12)",
                          background: "transparent",
                          color: "rgba(255,255,255,0.35)",
                          cursor: "pointer",
                          fontSize: "13px",
                          fontFamily: "'DM Sans',sans-serif",
                        }}
                      >
                        {t("capture.addItem")}
                      </button>
                    ) : (
                      <div>
                        <div
                          style={{
                            display: "flex",
                            gap: "8px",
                            marginBottom: "12px",
                          }}
                        >
                          <input
                            type="text"
                            value={manualQuery}
                            onChange={(e) =>
                              handleManualSearch(e.target.value)
                            }
                            placeholder={t("capture.searchFoods")}
                            autoFocus
                            style={{
                              flex: 1,
                              padding: "10px 14px",
                              borderRadius: "10px",
                              border: "1px solid rgba(255,255,255,0.1)",
                              background: "rgba(255,255,255,0.04)",
                              color: "#fff",
                              fontSize: "13px",
                              fontFamily: "'DM Sans',sans-serif",
                              outline: "none",
                            }}
                          />
                          <button
                            onClick={() => {
                              setAddingExtraItem(false);
                              setManualQuery("");
                              setManualResults([]);
                              setSelectedFood(null);
                            }}
                            style={{
                              padding: "10px",
                              borderRadius: "10px",
                              border: "1px solid rgba(255,255,255,0.1)",
                              background: "transparent",
                              color: "rgba(255,255,255,0.4)",
                              cursor: "pointer",
                              fontSize: "14px",
                              fontFamily: "'DM Sans',sans-serif",
                            }}
                          >
                            ✕
                          </button>
                        </div>
                        {manualSearching && (
                          <div
                            style={{
                              height: "3px",
                              borderRadius: "2px",
                              marginBottom: "12px",
                              width: "100%",
                              background:
                                "linear-gradient(90deg, transparent, #E8C872, transparent)",
                              backgroundSize: "200% 100%",
                              animation: "shimmer 1.5s infinite",
                            }}
                          />
                        )}
                        {manualResults.length > 0 && !selectedFood && (
                          <div style={{ marginBottom: "12px" }}>
                            {manualResults.map((food, i) => (
                              <div
                                key={i}
                                onClick={() => selectFood(food)}
                                style={{
                                  padding: "10px 12px",
                                  marginBottom: "6px",
                                  borderRadius: "8px",
                                  cursor: "pointer",
                                  background: "rgba(255,255,255,0.02)",
                                  border:
                                    "1px solid rgba(255,255,255,0.06)",
                                }}
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "baseline",
                                    marginBottom: "3px",
                                  }}
                                >
                                  <span
                                    style={{
                                      fontSize: "12px",
                                      fontWeight: 500,
                                      color: "#fff",
                                    }}
                                  >
                                    {food.name}
                                  </span>
                                  <span
                                    style={{
                                      fontSize: "11px",
                                      color: "#E8C872",
                                      fontWeight: 600,
                                    }}
                                  >
                                    {Math.round(
                                      food.per100g?.calories ||
                                        food.calories,
                                    )}{" "}
                                    cal
                                  </span>
                                </div>
                                <div
                                  style={{
                                    display: "flex",
                                    gap: "8px",
                                    fontSize: "10px",
                                    color: "rgba(255,255,255,0.3)",
                                  }}
                                >
                                  <span
                                    style={{
                                      padding: "1px 5px",
                                      borderRadius: "3px",
                                      fontSize: "8px",
                                      fontWeight: 600,
                                      background:
                                        food.source === "usda"
                                          ? "rgba(123,224,173,0.1)"
                                          : "rgba(114,180,232,0.1)",
                                      color:
                                        food.source === "usda"
                                          ? "#7BE0AD"
                                          : "#72B4E8",
                                      textTransform: "uppercase",
                                    }}
                                  >
                                    {food.source === "usda"
                                      ? "USDA"
                                      : food.source === "barcode_off"
                                        ? "BARCODE"
                                        : "OFF"}
                                  </span>
                                  <span>
                                    P{" "}
                                    {
                                      +(
                                        food.per100g?.protein_g ??
                                        food.protein_g
                                      ).toFixed(1)
                                    }
                                    g
                                  </span>
                                  <span>
                                    C{" "}
                                    {
                                      +(
                                        food.per100g?.carbs_g ??
                                        food.carbs_g
                                      ).toFixed(1)
                                    }
                                    g
                                  </span>
                                  <span>
                                    F{" "}
                                    {
                                      +(
                                        food.per100g?.fat_g ?? food.fat_g
                                      ).toFixed(1)
                                    }
                                    g
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        {selectedFood && scaledFoodMacros && (
                          <div
                            style={{
                              padding: "14px",
                              borderRadius: "10px",
                              background: "rgba(232,200,114,0.04)",
                              border: "1px solid rgba(232,200,114,0.1)",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "baseline",
                                marginBottom: "10px",
                              }}
                            >
                              <span
                                style={{
                                  fontSize: "13px",
                                  fontWeight: 600,
                                  color: "#fff",
                                }}
                              >
                                {selectedFood.name}
                              </span>
                              <button
                                onClick={() => {
                                  setSelectedFood(null);
                                  setManualResults([]);
                                  setManualQuery("");
                                }}
                                style={{
                                  background: "none",
                                  border: "none",
                                  color: "rgba(255,255,255,0.3)",
                                  cursor: "pointer",
                                  fontSize: "12px",
                                }}
                              >
                                ✕
                              </button>
                            </div>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "10px",
                                marginBottom: "12px",
                              }}
                            >
                              <label
                                style={{
                                  fontSize: "11px",
                                  color: "rgba(255,255,255,0.4)",
                                }}
                              >
                                {t("capture.amount")}
                              </label>
                              <input
                                type="number"
                                value={manualGrams}
                                onChange={(e) =>
                                  setManualGrams(
                                    Math.max(
                                      1,
                                      parseInt(e.target.value) || 1,
                                    ),
                                  )
                                }
                                style={{
                                  width: "70px",
                                  padding: "6px 10px",
                                  borderRadius: "8px",
                                  border:
                                    "1px solid rgba(255,255,255,0.12)",
                                  background: "rgba(255,255,255,0.06)",
                                  color: "#fff",
                                  fontSize: "13px",
                                  fontWeight: 600,
                                  textAlign: "center",
                                  fontFamily: "'DM Sans',sans-serif",
                                  outline: "none",
                                }}
                              />
                              <span
                                style={{
                                  fontSize: "12px",
                                  color: "rgba(255,255,255,0.4)",
                                }}
                              >
                                {t("capture.grams")}
                              </span>
                            </div>
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                marginBottom: "12px",
                              }}
                            >
                              {[
                                {
                                  label: "Cal",
                                  value: scaledFoodMacros.calories,
                                  color: "#E8C872",
                                },
                                {
                                  label: "P",
                                  value: `${scaledFoodMacros.protein_g}g`,
                                  color: "#7BE0AD",
                                },
                                {
                                  label: "C",
                                  value: `${scaledFoodMacros.carbs_g}g`,
                                  color: "#72B4E8",
                                },
                                {
                                  label: "F",
                                  value: `${scaledFoodMacros.fat_g}g`,
                                  color: "#E87272",
                                },
                              ].map(({ label, value, color }) => (
                                <div
                                  key={label}
                                  style={{ textAlign: "center" }}
                                >
                                  <div
                                    style={{
                                      fontSize: "14px",
                                      fontWeight: 700,
                                      color,
                                    }}
                                  >
                                    {value}
                                  </div>
                                  <div
                                    style={{
                                      fontSize: "9px",
                                      color: "rgba(255,255,255,0.3)",
                                      textTransform: "uppercase",
                                    }}
                                  >
                                    {label}
                                  </div>
                                </div>
                              ))}
                            </div>
                            <button
                              onClick={addExtraItemToScan}
                              style={{
                                width: "100%",
                                padding: "8px",
                                borderRadius: "8px",
                                border: "none",
                                cursor: "pointer",
                                background:
                                  "linear-gradient(135deg, #E8C872, #D4A843)",
                                color: "#0C0C0E",
                                fontSize: "12px",
                                fontWeight: 700,
                                fontFamily: "'DM Sans',sans-serif",
                              }}
                            >
                              + Add
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Meal Notes */}
              {analysis.meal_notes && (
                <div
                  style={{
                    margin: "16px 20px",
                    padding: "14px 16px",
                    borderRadius: "10px",
                    background: "rgba(232,200,114,0.04)",
                    border: "1px solid rgba(232,200,114,0.08)",
                  }}
                >
                  <p
                    style={{
                      fontSize: "12px",
                      color: "rgba(255,255,255,0.5)",
                      lineHeight: 1.6,
                      fontStyle: "italic",
                    }}
                  >
                    💡 {analysis.meal_notes}
                  </p>
                </div>
              )}

              {/* Meal Type Picker */}
              {(!mealDetailMode || isEditing) && (
                <MealTypePicker
                  value={selectedMealType}
                  onChange={setSelectedMealType}
                />
              )}

              {/* Actions */}
              <div
                style={{
                  padding: "16px 20px 32px",
                  display: "flex",
                  gap: "12px",
                }}
              >
                {mealDetailMode && !isEditing ? (
                  <>
                    <button
                      onClick={() => {
                        setMealDetailMode(false);
                        setAnalysis(null);
                        setImage(null);
                        setView("daily");
                      }}
                      style={{
                        flex: 1,
                        padding: "14px",
                        borderRadius: "12px",
                        cursor: "pointer",
                        border: "1px solid rgba(255,255,255,0.1)",
                        background: "transparent",
                        color: "#fff",
                        fontSize: "13px",
                        fontFamily: "'DM Sans',sans-serif",
                      }}
                    >
                      ← {t("capture.backToLog")}
                    </button>
                    <button
                      onClick={onStartEdit}
                      style={{
                        flex: 1,
                        padding: "14px",
                        borderRadius: "12px",
                        border: "none",
                        cursor: "pointer",
                        background:
                          "linear-gradient(135deg, #E8C872, #D4A843)",
                        color: "#0C0C0E",
                        fontSize: "13px",
                        fontWeight: 700,
                        fontFamily: "'DM Sans',sans-serif",
                      }}
                    >
                      {t("capture.editMeal")}
                    </button>
                  </>
                ) : mealDetailMode && isEditing ? (
                  <>
                    <button
                      onClick={onCancelEdit}
                      style={{
                        flex: 1,
                        padding: "14px",
                        borderRadius: "12px",
                        cursor: "pointer",
                        border: "1px solid rgba(255,255,255,0.1)",
                        background: "transparent",
                        color: "#fff",
                        fontSize: "13px",
                        fontFamily: "'DM Sans',sans-serif",
                      }}
                    >
                      {t("capture.cancel")}
                    </button>
                    <button
                      onClick={onSaveEdit}
                      style={{
                        flex: 1,
                        padding: "14px",
                        borderRadius: "12px",
                        border: "none",
                        cursor: "pointer",
                        background:
                          "linear-gradient(135deg, #7BE0AD, #4CB97A)",
                        color: "#0C0C0E",
                        fontSize: "13px",
                        fontWeight: 700,
                        fontFamily: "'DM Sans',sans-serif",
                      }}
                    >
                      {t("capture.saveChanges")}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={resetCapture}
                      style={{
                        flex: 1,
                        padding: "14px",
                        borderRadius: "12px",
                        cursor: "pointer",
                        border: "1px solid rgba(255,255,255,0.1)",
                        background: "transparent",
                        color: "#fff",
                        fontSize: "13px",
                        fontFamily: "'DM Sans',sans-serif",
                      }}
                    >
                      {t("capture.newScan")}
                    </button>
                    <button
                      onClick={addToDaily}
                      style={{
                        flex: 1,
                        padding: "14px",
                        borderRadius: "12px",
                        border: "none",
                        cursor: "pointer",
                        background:
                          "linear-gradient(135deg, #7BE0AD, #4CB97A)",
                        color: "#0C0C0E",
                        fontSize: "13px",
                        fontWeight: 700,
                        fontFamily: "'DM Sans',sans-serif",
                      }}
                    >
                      {t("capture.addToLog")}
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
