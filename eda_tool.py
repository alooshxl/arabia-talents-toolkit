"""
Basic Exploratory Data Analysis (EDA) Tool for Excel Files.

This script takes an Excel file as input, performs basic EDA tasks,
and generates an HTML report summarizing the findings. The report includes:
- Null value counts for each column.
- Data types of each column.
- Summary statistics for numerical columns.
- Visualizations:
    - Bar charts for categorical column value counts.
    - Histograms for numerical column distributions.
    - Pie charts for categorical columns with a small number of unique values.

The generated plots and the HTML report are saved in a 'reports' directory.
"""
import pandas as pd
import argparse
import os
import matplotlib.pyplot as plt
import seaborn as sns

def generate_html_report(report_title, text_sections, image_paths, output_html_path):
    """
    Generates an HTML report from text sections and image paths.

    Args:
        report_title (str): The title for the HTML report.
        text_sections (list): A list of dictionaries, where each dictionary
                              contains 'title' (str) and 'content' (str - HTML formatted)
                              for a textual EDA section.
        image_paths (list): A list of strings, where each string is the full path
                            to a saved plot image. Image filenames are used for src
                            attributes in HTML, assuming images are in the same dir as the report.
        output_html_path (str): The full path where the HTML report will be saved.
    """
    html_content = f"""
    <html>
    <head>
        <title>{report_title}</title>
        <style>
            body {{ font-family: Arial, sans-serif; margin: 20px; background-color: #f4f4f4; color: #333; }}
            h1 {{ color: #333; border-bottom: 2px solid #4CAF50; padding-bottom: 10px; }}
            h2 {{ color: #4CAF50; }}
            .section {{ background-color: #fff; margin-bottom: 20px; padding: 15px; border-radius: 5px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }}
            .plot {{ margin-top: 10px; text-align: center; }}
            .plot img {{ max-width: 90%; height: auto; border: 1px solid #ddd; border-radius: 4px; padding: 5px; }}
            table {{ border-collapse: collapse; width: auto; margin-top: 10px; }}
            th, td {{ text-align: left; padding: 8px; border: 1px solid #ddd; }}
            th {{ background-color: #4CAF50; color: white; }}
            tr:nth-child(even) {{ background-color: #f2f2f2; }}
            pre {{ background-color: #eee; padding: 10px; border-radius: 4px; white-space: pre-wrap; word-wrap: break-word; }}
        </style>
    </head>
    <body>
        <h1>{report_title}</h1>
    """

    for section in text_sections:
        html_content += f"""
        <div class="section">
            <h2>{section['title']}</h2>
            {section['content']}
        </div>
        """

    if image_paths:
        html_content += """
        <div class="section">
            <h2>Visualizations</h2>
        """
        for img_path_full in image_paths:
            img_filename = os.path.basename(img_path_full)
            # Assuming html file is in the same directory as images (reports/)
            html_content += f"""
            <div class="plot">
                <p>{img_filename.replace('_', ' ').rsplit('.', 1)[0]}</p>
                <img src="{img_filename}" alt="{img_filename}">
            </div>
            """
        html_content += "</div>"

    html_content += """
    </body>
    </html>
    """
    with open(output_html_path, 'w') as f:
        f.write(html_content)
    print(f"HTML report generated at {output_html_path}")


def perform_eda(file_path):
    """
    Performs basic Exploratory Data Analysis on an Excel file and generates an HTML report.

    The function reads data from the given Excel file, performs various EDA checks
    (null values, data types, summary statistics), generates visualizations
    (bar charts, histograms, pie charts), and then compiles all this information
    into an HTML report.

    Args:
        file_path (str): The path to the Excel file to be analyzed.

    Side effects:
        - Prints status messages to the console during execution.
        - Creates image files for plots in the 'reports/' directory.
        - Creates an HTML report file in the 'reports/' directory.
    """
    try:
        df = pd.read_excel(file_path)
        original_file_name = os.path.basename(file_path)
        file_name_prefix = os.path.splitext(original_file_name)[0]

        reports_dir = "reports"
        os.makedirs(reports_dir, exist_ok=True)

        report_title = f"EDA Report for {original_file_name}"
        text_sections = []
        image_paths = []

        # --- Null Value Check ---
        null_counts_html = df.isnull().sum().to_frame(name='Null Count').to_html()
        text_sections.append({'title': 'Null Value Counts', 'content': null_counts_html})

        # --- Column Data Types ---
        dtypes_html = df.dtypes.to_frame(name='Data Type').to_html()
        text_sections.append({'title': 'Column Data Types', 'content': dtypes_html})

        # --- Summary Statistics (Numerical Columns) ---
        numerical_cols_summary_df = df.select_dtypes(include='number')
        if not numerical_cols_summary_df.empty:
            summary_stats_html = numerical_cols_summary_df.describe().to_html()
            text_sections.append({'title': 'Summary Statistics (Numerical Columns)', 'content': summary_stats_html})
        else:
            text_sections.append({'title': 'Summary Statistics (Numerical Columns)', 'content': '<p>No numerical columns found.</p>'})

        # --- Generate and Save Visualizations ---
        print("\n--- Generating Visualizations (will be embedded in HTML) ---")

        # Bar Charts for Categorical Columns
        categorical_cols = df.select_dtypes(include=['object', 'category'])
        for col_name in categorical_cols.columns:
            plt.figure(figsize=(10, 6))
            try:
                sns.countplot(y=df[col_name], order=df[col_name].value_counts().index)
                plt.title(f"Value Counts for {col_name}")
                plt.xlabel("Count")
                plt.ylabel(col_name)
                plt.tight_layout()
                plot_filename = f"{file_name_prefix}_{col_name}_bar_chart.png"
                plot_path_full = os.path.join(reports_dir, plot_filename)
                plt.savefig(plot_path_full)
                image_paths.append(plot_path_full)
                print(f"Saved bar chart for {col_name} to {plot_path_full}")
            except Exception as e:
                print(f"Could not generate bar chart for {col_name}: {e}")
            finally:
                plt.clf()
                plt.close()

        # Histograms for Numerical Columns
        numerical_cols = df.select_dtypes(include='number')
        for col_name in numerical_cols.columns:
            plt.figure(figsize=(10, 6))
            try:
                sns.histplot(df[col_name].dropna(), kde=True)
                plt.title(f"Distribution of {col_name}")
                plt.xlabel(col_name)
                plt.ylabel("Frequency")
                plt.tight_layout()
                plot_filename = f"{file_name_prefix}_{col_name}_histogram.png"
                plot_path_full = os.path.join(reports_dir, plot_filename)
                plt.savefig(plot_path_full)
                image_paths.append(plot_path_full)
                print(f"Saved histogram for {col_name} to {plot_path_full}")
            except Exception as e:
                print(f"Could not generate histogram for {col_name}: {e}")
            finally:
                plt.clf()
                plt.close()

        # Pie Charts for Categorical Columns (with few unique values)
        for col_name in categorical_cols.columns:
            if df[col_name].nunique() <= 5 and df[col_name].nunique() > 0:
                plt.figure(figsize=(8, 8))
                try:
                    value_counts = df[col_name].value_counts()
                    plt.pie(value_counts, labels=value_counts.index, autopct='%1.1f%%', startangle=90)
                    plt.title(f"Proportions for {col_name}")
                    plt.tight_layout()
                    plot_filename = f"{file_name_prefix}_{col_name}_pie_chart.png"
                    plot_path_full = os.path.join(reports_dir, plot_filename)
                    plt.savefig(plot_path_full)
                    image_paths.append(plot_path_full)
                    print(f"Saved pie chart for {col_name} to {plot_path_full}")
                except Exception as e:
                    print(f"Could not generate pie chart for {col_name}: {e}")
                finally:
                    plt.clf()
                    plt.close()
            # Optional: add message for skipped pie charts to HTML if desired

        # Generate HTML report
        html_output_path = os.path.join(reports_dir, f"{file_name_prefix}_report.html")
        generate_html_report(report_title, text_sections, image_paths, html_output_path)

    except FileNotFoundError:
        print(f"Error: File not found at '{file_path}'")
    except Exception as e:
        print(f"An error occurred: {e}")

def main():
    """
    Main function to parse command-line arguments and initiate the EDA process.

    Sets up an argument parser to accept the Excel file path from the command line.
    Once arguments are parsed, it calls the perform_eda function.
    """
    parser = argparse.ArgumentParser(
        description="Perform basic Exploratory Data Analysis (EDA) on an Excel file and generate an HTML report."
    )
    parser.add_argument("--file",
                        type=str,
                        required=True,
                        help="Path to the Excel file for EDA. (e.g., data/sample_data.xlsx)")

    args = parser.parse_args()

    perform_eda(args.file)

if __name__ == "__main__":
    main()
