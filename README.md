# Downly - Social Media Video & Audio Downloader

A full-stack web application that allows users to download videos and extract audio from various social media platforms like YouTube, Instagram, and Twitter. The application supports video trimming, quality selection, and multiple output formats.

## Features

- Download videos from YouTube, Instagram, and Twitter in their original quality
- Extract audio from videos in high quality
- Trim videos and audio to extract specific segments
- Multiple video quality options (up to 1080p)
- Multiple audio quality options
- Convert videos to different formats (MP4, MKV)
- Convert audio to different formats (MP3, M4A, OGG, WAV)
- Clean and modern user interface
- Independent video and audio download processes
- Real-time download progress tracking

## Tech Stack

### Frontend

- Next.js 15
- React 19
- Tailwind CSS
- shadcn/ui components
- React Player
- React Hook Form with Zod validation

### Backend

- FastAPI (Python)
- yt-dlp for video/audio downloading
- FFmpeg for video/audio processing
- Async processing with background tasks

## Prerequisites

- Node.js 18+ and npm

For the backend:

- Python 3.9-3.12
- FFmpeg (installed on the system)
- yt-dlp (installed via pip)

## Installation

### Frontend Setup

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd video-dowloader
   ```

2. Install Next.js dependencies:

   ```bash
   npm install
   ```

3. Create a `.env.local` file with:

   ```
   API_BASE_URL=http://localhost:8000
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

The Next.js frontend will be available at http://localhost:3000

### Backend Setup

1. Navigate to the API directory:

   ```bash
   cd api
   ```

2. Create and activate a virtual environment:

   ```bash
   # For Windows
   python -m venv venv
   venv\Scripts\activate

   # For macOS/Linux
   python -m venv venv
   source venv/bin/activate
   ```

3. Install dependencies:

   ```bash
   pip install -r requirements.txt
   ```

4. Run the FastAPI server:
   ```bash
   python main.py
   ```

The FastAPI backend will be available at http://localhost:8000

## Usage

1. Open your browser and navigate to http://localhost:3000
2. Paste a video URL from YouTube, Instagram, or Twitter
3. Click the send button to analyze the video
4. Once analyzed, you'll see:
   - Video preview with thumbnail
   - Video information (title, channel, duration)
   - Video download options (quality, format, trim settings)
   - Audio download options (quality, format, trim settings)
5. For video download:
   - Select video quality
   - Select audio quality
   - Set trim range (optional)
   - Click "Download Video"
6. For audio extraction:
   - Select audio quality
   - Set trim range (optional)
   - Click "Download Audio"
7. Monitor the download progress and download the file when processing completes

## Supported Platforms

The application has been tested and works with videos from:

- YouTube
- Instagram
- Twitter
- Facebook

Note: Platform support depends on yt-dlp's capabilities. Some platforms may have limitations based on their terms of service.

## API Endpoints

- `GET /`: API welcome message
- `POST /video/info`: Get information about a video from its URL
- `POST /video/process`: Process a video (download, trim, convert)
- `POST /audio/process`: Process audio extraction (download, trim, convert)
- `GET /task/{task_id}`: Get the status of a processing task

## Legal Notice

This tool is for personal use only. Please respect copyright laws and terms of service of social media platforms.

## License

MIT

---

# Downly - Baixador de Vídeos e Áudios de Redes Sociais

Uma aplicação web full-stack que permite aos usuários baixar vídeos e extrair áudio de várias plataformas de redes sociais como YouTube, Instagram e Twitter. A aplicação suporta corte de vídeos, seleção de qualidade e múltiplos formatos de saída.

## Funcionalidades

- Baixar vídeos do YouTube, Instagram e Twitter em sua qualidade original
- Extrair áudio de vídeos em alta qualidade
- Recortar vídeos e áudios para extrair segmentos específicos
- Múltiplas opções de qualidade de vídeo (até 1080p)
- Múltiplas opções de qualidade de áudio
- Converter vídeos para diferentes formatos (MP4, MKV)
- Converter áudio para diferentes formatos (MP3, M4A, OGG, WAV)
- Interface de usuário limpa e moderna
- Processos independentes de download de vídeo e áudio
- Acompanhamento do progresso de download em tempo real

## Stack Tecnológica

### Frontend

- Next.js 15
- React 19
- Tailwind CSS
- Componentes shadcn/ui
- React Player
- React Hook Form com validação Zod

### Backend

- FastAPI (Python)
- yt-dlp para download de vídeo/áudio
- FFmpeg para processamento de vídeo/áudio
- Processamento assíncrono com tarefas em segundo plano

## Pré-requisitos

- Node.js 18+ e npm

Para o backend:

- Python 3.9-3.12
- FFmpeg (instalado no sistema)
- yt-dlp (instalado via pip)

## Instalação

### Configuração do Frontend

1. Clone o repositório:

   ```bash
   git clone <url-do-repositório>
   cd video-dowloader
   ```

2. Instale as dependências do Next.js:

   ```bash
   npm install
   ```

3. Crie um arquivo `.env.local` com:

   ```
   API_BASE_URL=http://localhost:8000
   ```

4. Execute o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

O frontend Next.js estará disponível em http://localhost:3000

### Configuração do Backend

1. Navegue até o diretório da API:

   ```bash
   cd api
   ```

2. Crie e ative um ambiente virtual:

   ```bash
   # Para Windows
   python -m venv venv
   venv\Scripts\activate

   # Para macOS/Linux
   python -m venv venv
   source venv/bin/activate
   ```

3. Instale as dependências:

   ```bash
   pip install -r requirements.txt
   ```

4. Execute o servidor FastAPI:
   ```bash
   python main.py
   ```

O backend FastAPI estará disponível em http://localhost:8000

## Como Usar

1. Abra seu navegador e acesse http://localhost:3000
2. Cole uma URL de vídeo do YouTube, Instagram ou Twitter
3. Clique no botão de enviar para analisar o vídeo
4. Após a análise, você verá:
   - Pré-visualização do vídeo com miniatura
   - Informações do vídeo (título, canal, duração)
   - Opções de download de vídeo (qualidade, formato, configurações de recorte)
   - Opções de download de áudio (qualidade, formato, configurações de recorte)
5. Para download de vídeo:
   - Selecione a qualidade do vídeo
   - Selecione a qualidade do áudio
   - Defina o intervalo de recorte (opcional)
   - Clique em "Download Video"
6. Para extração de áudio:
   - Selecione a qualidade do áudio
   - Defina o intervalo de recorte (opcional)
   - Clique em "Download Audio"
7. Acompanhe o progresso do download e baixe o arquivo quando o processamento for concluído

## Plataformas Suportadas

A aplicação foi testada e funciona com vídeos de:

- YouTube
- Instagram
- Twitter
- Facebook

Nota: O suporte às plataformas depende das capacidades do yt-dlp. Algumas plataformas podem ter limitações com base em seus termos de serviço.

## Endpoints da API

- `GET /`: Mensagem de boas-vindas da API
- `POST /video/info`: Obter informações sobre um vídeo a partir da URL
- `POST /video/process`: Processar um vídeo (download, recorte, conversão)
- `POST /audio/process`: Processar extração de áudio (download, recorte, conversão)
- `GET /task/{task_id}`: Obter o status de uma tarefa de processamento

## Aviso Legal

Esta ferramenta é apenas para uso pessoal. Por favor, respeite as leis de direitos autorais e os termos de serviço das plataformas de redes sociais.

## Licença

MIT
