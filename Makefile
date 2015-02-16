UGLIFYJS=uglifyjs
UGLIFYCSS=uglifycss
BUILD_DIR=build

SCRIPTS:=$(wildcard src/*.js) $(wildcard src/*/*.js)
SCRIPTS_DEST:=$(patsubst src/%,$(BUILD_DIR)/%,$(SCRIPTS))

STYLES:=$(wildcard src/*.css) $(wildcard src/*/*.css)
STYLES_DEST:=$(patsubst src/%,$(BUILD_DIR)/%,$(STYLES))

OTHERS:=$(wildcard src/*) $(wildcard src/*/*)
OTHERS:=$(filter-out %.js %.css,$(OTHERS))
OTHERS_DEST:=$(patsubst src/%,$(BUILD_DIR)/%,$(OTHERS))

all: build_dir \
  other_files \
  compress_scripts \
  compress_styles \

build_dir:
  mkdir -p $(BUILD_DIR)

compress_scripts: $(SCRIPTS_DEST)
$(SCRIPTS_DEST): $(BUILD_DIR)/%: src/%
  $(UGLIFYJS) -nc -o $@ $<

compress_styles: $(STYLES_DEST)
$(STYLES_DEST): $(BUILD_DIR)/%: src/%
  $(UGLIFYCSS) $< >$@

other_files: $(OTHERS_DEST)
$(OTHERS_DEST): $(BUILD_DIR)/%: src/%
  @if [ -d $< ]; \
    then \
    mkdir -p $@; \
    echo "mkdir -p $@"; \
  else \
    cp $< $@; \
    echo "cp $< $@"; \
  fi

.PHONY: clean
clean:
  -rm -rf $(BUILD_DIR)
