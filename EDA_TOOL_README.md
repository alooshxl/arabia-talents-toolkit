# Python EDA Tool for Excel Files

## Description
This tool performs a basic Exploratory Data Analysis (EDA) on data provided in an Excel file. It generates a comprehensive HTML report that includes textual summaries and visualizations to help understand the dataset's characteristics.

## Features
- Reads data from `.xlsx` Excel files.
- Performs basic EDA:
    - Null value counts for each column.
    - Data type identification for each column.
    - Summary statistics (mean, std, min, max, quartiles) for numerical columns.
- Generates visualizations:
    - Bar charts for categorical column value counts.
    - Histograms for numerical column distributions.
    - Pie charts for categorical columns with a small number of unique values (<= 5).
- Outputs a single HTML report containing all textual EDA and embedded visualizations.
- Saves generated plots as individual PNG files in a `reports/` directory.

## Requirements
- Python 3.x
- Dependencies (also listed in `requirements.txt`):
    - pandas
    - matplotlib
    - seaborn
    - openpyxl

## Installation
1. Ensure you have Python 3.x installed.
2. Clone this repository or download the source files.
3. Navigate to the project's root directory in your terminal (or the directory containing `eda_tool.py` and `requirements.txt`).
4. Install the required dependencies:
   ```bash
   pip install -r requirements.txt
   ```

## Usage
To run the EDA tool, use the following command from the directory containing `eda_tool.py`:

```bash
python eda_tool.py --file path/to/your_excel_file.xlsx
```

Replace `path/to/your_excel_file.xlsx` with the actual path to your Excel file.

**Example using the sample data provided:**
```bash
python eda_tool.py --file data/sample_data.xlsx
```

## Output
The tool will produce the following outputs:
- **Console Messages:** Status updates during the EDA process, including confirmation of saved plots and the HTML report.
- **`reports/` directory:** This directory will be created (relative to where `eda_tool.py` is run) if it doesn't exist.
    - **Plot Images:** Individual plots (bar charts, histograms, pie charts) will be saved as PNG files in this directory (e.g., `[your_excel_file_prefix]_column_name_bar_chart.png`).
    - **HTML Report:** A comprehensive HTML report (e.g., `[your_excel_file_prefix]_report.html`) will be saved in this directory, embedding the generated plots and textual EDA.

## Sample Data for Testing
A sample Excel file is provided at `data/sample_data.xlsx`. You can use this file to test the tool and see an example of the generated report.

**To test with sample data:**
1. Ensure dependencies are installed (see Installation).
2. Run the command from the directory containing `eda_tool.py`:
   ```bash
   python eda_tool.py --file data/sample_data.xlsx
   ```
3. Check the `reports/` directory for `sample_data_report.html` and associated PNG images.
4. Open `sample_data_report.html` in a web browser to view the full report.

This will help verify that the tool is working correctly and give you an understanding of its output format.
